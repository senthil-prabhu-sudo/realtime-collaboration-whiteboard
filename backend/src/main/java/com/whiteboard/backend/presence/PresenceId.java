package com.whiteboard.backend.presence;

import java.io.Serializable;
import java.util.Objects;

public class PresenceId implements Serializable {

    private String sessionId;
    private String userId;

    // REQUIRED by JPA
    public PresenceId() {}

    public PresenceId(String sessionId, String userId) {
        this.sessionId = sessionId;
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof PresenceId)) return false;
        PresenceId that = (PresenceId) o;
        return Objects.equals(sessionId, that.sessionId)
                && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sessionId, userId);
    }
}
