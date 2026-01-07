package com.whiteboard.backend.user;

/**
 * Public user profile DTO.
 */
public record UserProfileResponse(
        String id,
        String email,
        String displayName,
        String avatarUrl
) {}
