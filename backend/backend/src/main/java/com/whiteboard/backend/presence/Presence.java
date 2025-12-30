package com.whiteboard.backend.presence;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "user_presence",
        indexes = {
                @Index(name = "idx_presence_session", columnList = "session_id")
        }
)
@IdClass(PresenceId.class)
@Getter
@Setter
public class Presence {

    @Id
    @Column(name = "session_id", nullable = false, length = 64)
    private String sessionId;

    @Id
    @Column(name = "user_id", nullable = false, length = 64)
    private String userId;

    @Column(name = "last_seen", nullable = false)
    private Instant lastSeen;

    @PrePersist
    @PreUpdate
    protected void touch() {
        this.lastSeen = Instant.now();
    }
}
