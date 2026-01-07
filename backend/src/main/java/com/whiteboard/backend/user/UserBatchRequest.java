package com.whiteboard.backend.user;

import java.util.List;

/**
 * Request body for batch user lookup.
 */
public record UserBatchRequest(
        List<String> ids
) {}
