package com.whiteboard.backend.config;

import com.whiteboard.backend.security.JwtFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // Enable CORS
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Disable CSRF (API + JWT)
                .csrf(csrf -> csrf.disable())

                // Stateless API
                .sessionManagement(sm ->
                        sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        // ✅ ALLOW PREFLIGHT (must be first)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // ✅ AUTH ENDPOINTS
                        .requestMatchers("/auth/**").permitAll()

                        // ✅ WEBSOCKET
                        .requestMatchers("/ws/**").permitAll()

                        // ✅ SESSION ENDPOINTS (ALL PUBLIC for now)
                        .requestMatchers("/sessions/**").permitAll()
                        
                        // ✅ WHITEBOARD CONTENT (anonymous drawing allowed)
                        .requestMatchers("/strokes/**").permitAll()
                        .requestMatchers("/chat/**").permitAll()
                        .requestMatchers("/presence/**").permitAll()
                        
                        // 🔒 USER ENDPOINTS (require authentication)
                        .requestMatchers("/users/**").authenticated()
                        
                        // ✅ DEBUG ENDPOINTS (public access)
                        .requestMatchers("/debug/**").permitAll()

                        // ✅ Allow everything else (for debugging)
                        .anyRequest().permitAll()
                )

                // JWT filter
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(List.of(
                "https://realtime-collaboration-whiteboard.vercel.app",
                "https://realtime-collaboration-whiteboard-production.up.railway.app",
                "http://localhost:5173",
                "http://localhost:3000"
        ));

        config.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"
        ));
        
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        
        // Important: Set max age for preflight cache
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }
}