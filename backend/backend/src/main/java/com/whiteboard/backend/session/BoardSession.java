package com.whiteboard.backend.session;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "collaboration_sessions")
@Getter
@Setter
public class BoardSession {

    @Id
    private String id;
    private String name;
    private String creatorId;
    private Boolean isPublic;
}
