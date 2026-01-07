package com.whiteboard.backend.stroke;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(
        name = "session_strokes",
        indexes = {
                @Index(name = "idx_stroke_session", columnList = "session_id"),
                @Index(name = "idx_stroke_user", columnList = "user_id"),
                @Index(name = "idx_stroke_active", columnList = "active")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Stroke {

    @Id
    @Column(nullable = false, updatable = false)
    private String id;

    @Column(name = "session_id", nullable = false)
    private String sessionId;

    @Column(name = "user_id", nullable = true)
    private String userId;

    /**
     * JSON payload:
     * {
     *   points: [...],
     *   color: "#000000",
     *   size: 3,
     *   tool: "pen"
     * }
     *
     * IMPORTANT:
     * - Must support large JSON payloads
     * - @Lob alone is NOT enough in all DBs
     */
    @Lob
    @Column(
            name = "stroke_data",
            nullable = false,
            columnDefinition = "LONGTEXT"
    )
    private String strokeData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * Soft state for undo/redo
     * true  = visible
     * false = undone
     */
    @Column(nullable = false)
    private boolean active = true;
}
