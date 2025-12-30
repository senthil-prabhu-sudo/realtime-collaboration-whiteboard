package com.whiteboard.backend.presence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PresenceRepository
        extends JpaRepository<Presence, PresenceId> {

    List<Presence> findBySessionId(String sessionId);

    void deleteBySessionIdAndUserId(String sessionId, String userId);
}
