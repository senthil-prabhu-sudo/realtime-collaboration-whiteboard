package com.whiteboard.backend.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "collaboration_session")
@Getter
@Setter
@NoArgsConstructor
public class BoardSession {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(name = "creator_id", nullable = true)
    private String creatorId;

    @Column(name = "is_public", nullable = false)
    private Boolean isPublic;

    @Column(name = "allow_collaborative_drawing", nullable = false)
    private Boolean allowCollaborativeDrawing;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
