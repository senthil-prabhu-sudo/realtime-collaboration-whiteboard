package com.whiteboard.backend.chat;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "chat_messages",
        indexes = {
                @Index(name = "idx_chat_session_created", columnList = "session_id, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {

    @Id
    @JsonProperty("id")
    @Column(nullable = false, length = 36)
    private String id;

    @Column(name = "session_id", nullable = false, length = 36)
    @JsonProperty("sessionId")
    private String sessionId;

    @Column(name = "user_id", nullable = false, length = 36)
    @JsonProperty("userId")
    private String userId;

    @Column(nullable = false, length = 2000)
    @JsonProperty("message")
    private String message;

    @Column(name = "created_at", nullable = false, updatable = false)
    @JsonProperty("createdAt")
    private Instant createdAt;

    @PrePersist
    protected void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
