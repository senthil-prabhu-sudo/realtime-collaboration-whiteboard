package com.whiteboard.backend.stroke;

import java.util.List;

/**
 * Single-stroke request payload.
 * Uses the canonical Point DTO.
 */
public record CreateStrokeRequest(
        String sessionId,
        List<Point> points,
        String color,
        int size,
        String tool
) {}
