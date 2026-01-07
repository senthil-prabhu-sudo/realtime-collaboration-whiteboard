package com.whiteboard.backend.stroke;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

public record StrokeData(
        List<Point> points,
        String color,
        int size,
        String tool,
        String text
) {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static StrokeData from(CreateStrokeRequest req) {
        return new StrokeData(
                req.points(),
                req.color(),
                req.size(),
                req.tool(),
                req.text()
        );
    }

    public static StrokeData from(StrokeMessage msg) {
        return new StrokeData(
                msg.points(),
                msg.color(),
                msg.size(),
                msg.tool(),
                msg.text()
        );
    }

    public String toJson() {
        try {
            return MAPPER.writeValueAsString(this);
        } catch (Exception e) {
            throw new RuntimeException("StrokeData JSON serialization failed", e);
        }
    }
}
