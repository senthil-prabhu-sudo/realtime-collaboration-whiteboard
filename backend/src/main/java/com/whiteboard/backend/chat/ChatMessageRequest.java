package com.whiteboard.backend.chat;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Request payload for chat messages.
 * Matches frontend payload: { message: string }
 */
public class ChatMessageRequest {

    @JsonProperty("message")
    private String message;

    public ChatMessageRequest() {}

    public ChatMessageRequest(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "ChatMessageRequest{message='" + message + "'}";
    }
}
