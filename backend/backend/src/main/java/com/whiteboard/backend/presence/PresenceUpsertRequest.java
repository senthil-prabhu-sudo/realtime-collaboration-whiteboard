package com.whiteboard.backend.presence;

import jakarta.validation.constraints.NotBlank;

/**
 * Client sends ONLY sessionId.
 * User identity is derived from JWT.
 */
public record PresenceUpsertRequest(
        @NotBlank
        String sessionId
) {}
