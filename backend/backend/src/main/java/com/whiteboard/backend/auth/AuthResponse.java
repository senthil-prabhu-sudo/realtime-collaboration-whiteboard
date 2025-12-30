package com.whiteboard.backend.auth;

public record AuthResponse(
        String token,
        AuthUser user
) {
    public record AuthUser(
            String id,
            String email
    ) {}
}
