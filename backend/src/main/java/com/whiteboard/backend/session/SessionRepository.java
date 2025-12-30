package com.whiteboard.backend.session;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SessionRepository extends JpaRepository<BoardSession, String> {

    List<BoardSession> findByCreatorId(String creatorId);
}
