package com.whiteboard.backend.security;

import com.whiteboard.backend.auth.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    public JwtFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    /* ---------------------------------------------
       Skip JWT filter for public endpoints
    --------------------------------------------- */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();

        return path.startsWith("/auth/")
                || path.startsWith("/ws/")
                || path.startsWith("/sessions/")
                || path.startsWith("/strokes/")
                || path.startsWith("/chat/")
                || path.startsWith("/presence/")
                || path.startsWith("/error")
                || path.startsWith("/actuator/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // Allow CORS preflight
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        // If no Authorization header, continue without authentication
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);

        try {
            /* ---------------------------------------------
               Validate JWT
            --------------------------------------------- */
            JwtUtil.JwtUser jwtUser = jwtUtil.validateAndExtract(token);

            // If token is invalid, just continue without authentication
            // rather than throwing an exception
            if (jwtUser != null) {
                /* ---------------------------------------------
                   Set authorities
                --------------------------------------------- */
                List<SimpleGrantedAuthority> authorities =
                        jwtUser.isAdmin()
                                ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                                : Collections.emptyList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                jwtUser.userId(),
                                null,
                                authorities
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);
            }

        } catch (Exception ex) {
            // Log the error but don't throw exception
            // This allows public endpoints to work even with invalid tokens
            System.err.println("JWT validation error (non-fatal): " + ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        // Always continue the filter chain
        filterChain.doFilter(request, response);
    }
}