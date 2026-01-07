package com.whiteboard.backend.auth;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Component
public class JwtUtil {

    private final SecretKey signingKey;
    private final long expirationMillis;

    /* -------------------------------------------------
       Constructor (strict secret validation)
    ------------------------------------------------- */
    public JwtUtil(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-ms:86400000}") long expirationMillis
    ) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalArgumentException(
                    "JWT secret must be at least 32 characters (256 bits)"
            );
        }

        this.signingKey = Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
        this.expirationMillis = expirationMillis;
    }

    /* -------------------------------------------------
       JWT USER MODEL
       (used by JwtFilter only)
    ------------------------------------------------- */
    public record JwtUser(
            String userId,
            boolean isAdmin
    ) {}

    /* -------------------------------------------------
       Generate JWT
    ------------------------------------------------- */
    public String generateToken(String userId) {
        return generateToken(userId, false);
    }

    public String generateToken(String userId, boolean isAdmin) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMillis);

        return Jwts.builder()
                .setSubject(userId)
                .claim(
                        "roles",
                        isAdmin ? List.of("ROLE_ADMIN") : List.of()
                )
                .setIssuedAt(now)
                .setExpiration(expiry)
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    /* -------------------------------------------------
       Validate + extract (STRICT & SAFE)
    ------------------------------------------------- */
    public JwtUser validateAndExtract(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(signingKey)
                    .setAllowedClockSkewSeconds(30) // tolerate small clock drift
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            String userId = claims.getSubject();

            if (userId == null || userId.isBlank()) {
                throw new JwtException("JWT subject (userId) missing");
            }

            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles", List.class);

            boolean isAdmin =
                    roles != null && roles.contains("ROLE_ADMIN");

            return new JwtUser(userId, isAdmin);

        } catch (ExpiredJwtException e) {
            throw new JwtException("JWT expired", e);
        } catch (SignatureException e) {
            throw new JwtException("JWT signature invalid", e);
        } catch (MalformedJwtException e) {
            throw new JwtException("JWT malformed", e);
        } catch (UnsupportedJwtException e) {
            throw new JwtException("JWT unsupported", e);
        } catch (IllegalArgumentException e) {
            throw new JwtException("JWT illegal argument", e);
        }
    }

    /* -------------------------------------------------
       Backward compatibility
       (used by older code paths)
    ------------------------------------------------- */
    public String validate(String token) {
        return validateAndExtract(token).userId();
    }
}
