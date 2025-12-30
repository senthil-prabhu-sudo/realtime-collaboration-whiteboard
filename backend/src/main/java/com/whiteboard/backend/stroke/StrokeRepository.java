package com.whiteboard.backend.stroke;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StrokeRepository extends JpaRepository<Stroke, String> {

    /* ---------------------------------------------
       Load visible strokes (draw order)
    --------------------------------------------- */
    List<Stroke> findBySessionIdAndActiveTrueOrderByCreatedAtAsc(
            String sessionId
    );

    /* ---------------------------------------------
       Undo: find last active stroke by user
    --------------------------------------------- */
    List<Stroke> findBySessionIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(
            String sessionId,
            String userId
    );

    /* ---------------------------------------------
       Redo: find last undone stroke by user
    --------------------------------------------- */
    Optional<Stroke> findTopBySessionIdAndUserIdAndActiveFalseOrderByCreatedAtDesc(
            String sessionId,
            String userId
    );

    /* ---------------------------------------------
       Clear canvas (hard delete)
    --------------------------------------------- */
    void deleteBySessionId(String sessionId);
}
