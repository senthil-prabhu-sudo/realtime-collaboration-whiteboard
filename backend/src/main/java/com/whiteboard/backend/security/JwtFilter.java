package com.whiteboard.backend.security;

import com.whiteboard.backend.auth.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(JwtFilter.class);
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
        String method = request.getMethod();

        boolean skip = path.startsWith("/auth/")
                || path.startsWith("/ws/")
                || path.startsWith("/sessions/")
                || path.startsWith("/strokes/")
                || path.startsWith("/chat/")
                || path.startsWith("/presence/")
                || path.startsWith("/debug/")
                || path.startsWith("/error")
                || path.startsWith("/actuator/");

        logger.debug("JwtFilter.shouldNotFilter: {} {} -> {}", method, path, skip);
        return skip;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String path = request.getServletPath();
        String method = request.getMethod();

        logger.info("JwtFilter processing: {} {}", method, path);

        // Allow CORS preflight
        if ("OPTIONS".equalsIgnoreCase(method)) {
            logger.debug("OPTIONS request, allowing through");
            filterChain.doFilter(request, response);
            return;
        }

        String authHeader = request.getHeader("Authorization");

        // If no Authorization header, continue without authentication
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            logger.debug("No Bearer token found, continuing without authentication");
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        logger.debug("Found Bearer token: {}...", token.substring(0, Math.min(20, token.length())));

        try {
            /* ---------------------------------------------
               Validate JWT
            --------------------------------------------- */
            JwtUtil.JwtUser jwtUser = jwtUtil.validateAndExtract(token);

            // If token is invalid, just continue without authentication
            if (jwtUser != null) {
                logger.info("JWT valid for user: {}", jwtUser.userId());
                
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
                
                logger.debug("Authentication set in SecurityContext");
            } else {
                logger.warn("JWT validation returned null for token");
            }

        } catch (Exception ex) {
            // Log the error but don't throw exception
            logger.warn("JWT validation error (non-fatal) for {} {}: {}", 
                    method, path, ex.getMessage());
            SecurityContextHolder.clearContext();
        }

        // Always continue the filter chain
        logger.debug("Continuing filter chain");
        filterChain.doFilter(request, response);
    }
}