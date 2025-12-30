package com.whiteboard.backend.stroke;

import java.awt.*;
import java.util.Collections;
import java.util.List;

/**
 * Represents one stroke inside a batch request.
 *
 * MUST match frontend payload exactly:
 * {
 *   id: string,
 *   points: [{ x: number, y: number }],
 *   color: string,
 *   size: number,
 *   tool: string,
 *   text: string (optional)
 * }
 */
public record StrokeMessage(
        String id,
        List<Point> points,
        String color,
        int size,
        String tool,
        String text
) {

    /**
     * Defensive normalization.
     * - Never returns null points
     * - Applies safe defaults
     * - Prevents DB + JSON crashes
     */
    public StrokeMessage normalized() {
        return new StrokeMessage(
                id,
                points != null ? points : Collections.emptyList(),
                (color == null || color.isBlank()) ? "#000000" : color,
                size > 0 ? size : 3,
                (tool == null || tool.isBlank()) ? "pen" : tool,
                text
        );
    }
}
