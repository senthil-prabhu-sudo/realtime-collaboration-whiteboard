package com.whiteboard.backend.session;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRepository extends JpaRepository<BoardSession, String> {}
