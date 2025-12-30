package com.whiteboard.backend.stroke;

import java.util.Collections;
import java.util.List;

/**
 * Represents a batched stroke payload from the frontend.
 *
 * Payload shape:
 * {
 *   "sessionId": "abc123",
 *   "strokes": [ { ... }, { ... } ]
 * }
 */
public record StrokeBatchRequest(
        String sessionId,
        List<StrokeMessage> strokes
) {

    /**
     * Defensive normalization.
     * - Never returns null strokes
     * - Normalizes individual StrokeMessage objects
     * - Leaves sessionId untouched (validated separately)
     */
    public StrokeBatchRequest normalized() {
        return new StrokeBatchRequest(
                sessionId,
                strokes == null
                        ? Collections.emptyList()
                        : strokes.stream()
                        .map(StrokeMessage::normalized)
                        .toList()
        );
    }

    /**
     * Validation guard used by controllers.
     * Ensures request is safe to persist.
     */
    public boolean isValid() {
        return sessionId != null
                && !sessionId.isBlank()
                && strokes != null
                && !strokes.isEmpty();
    }
}
