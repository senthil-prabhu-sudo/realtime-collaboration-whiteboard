package com.whiteboard.backend.chat;

public record ChatMessageRequest(
        String sessionId,
        String message
) {}
