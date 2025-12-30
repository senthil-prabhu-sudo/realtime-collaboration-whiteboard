package com.whiteboard.backend.stroke;

import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/strokes")
@CrossOrigin(origins = "http://localhost:5173")
public class StrokeController {

    private final StrokeRepository repo;

    public StrokeController(StrokeRepository repo) {
        this.repo = repo;
    }

    /* ---------------------------------------------
       POST /strokes
       Single-stroke insert
    --------------------------------------------- */
    @PostMapping
    public ResponseEntity<Void> create(
            Authentication authentication,
            @RequestBody CreateStrokeRequest req
    ) {
        try {
            if (authentication == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            if (req == null || req.sessionId() == null || req.sessionId().isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            String userId = authentication.getName();

            Stroke stroke = new Stroke();
            stroke.setId(UUID.randomUUID().toString());
            stroke.setSessionId(req.sessionId());
            stroke.setUserId(userId);
            stroke.setCreatedAt(Instant.now());
            stroke.setStrokeData(StrokeData.from(req).toJson());
            stroke.setActive(true);

            repo.save(stroke);
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            // 🔴 CRITICAL: log real cause
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /* ---------------------------------------------
       POST /strokes/batch
       DEBUGGED & CRASH-TRANSPARENT
    --------------------------------------------- */
    @PostMapping("/batch")
    @Transactional
    public ResponseEntity<Void> createBatch(
            Authentication authentication,
            @RequestBody StrokeBatchRequest req
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (req == null || req.sessionId() == null || req.strokes() == null) {
            return ResponseEntity.badRequest().build();
        }

        String userId = authentication.getName();

        for (StrokeMessage raw : req.strokes()) {
            try {
                StrokeMessage msg = raw.normalized();

                if (msg.points().isEmpty()) {
                    continue;
                }

                Stroke stroke = new Stroke();
                stroke.setId(UUID.randomUUID().toString());
                stroke.setSessionId(req.sessionId());
                stroke.setUserId(userId);
                stroke.setCreatedAt(Instant.now());

                // 🔴 MOST COMMON FAILURE POINT
                stroke.setStrokeData(StrokeData.from(msg).toJson());

                stroke.setActive(true);
                repo.save(stroke);

            } catch (Exception e) {
                // 🔴 THIS WILL SHOW YOU THE REAL ERROR
                System.err.println("❌ Failed to persist stroke batch item");
                e.printStackTrace();
                throw e; // let Spring return 500
            }
        }

        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       GET /strokes/session/{sessionId}
    --------------------------------------------- */
    @GetMapping("/session/{sessionId}")
    public List<Stroke> bySession(@PathVariable String sessionId) {
        return repo.findBySessionIdAndActiveTrueOrderByCreatedAtAsc(sessionId);
    }

    /* ---------------------------------------------
       UNDO
    --------------------------------------------- */
    @PostMapping("/undo/{sessionId}")
    @Transactional
    public ResponseEntity<Void> undo(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName();

        List<Stroke> strokes =
                repo.findBySessionIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(
                        sessionId, userId
                );

        if (strokes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        strokes.get(0).setActive(false);
        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       REDO
    --------------------------------------------- */
    @PostMapping("/redo/{sessionId}")
    @Transactional
    public ResponseEntity<Void> redo(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = authentication.getName();

        Stroke stroke =
                repo.findTopBySessionIdAndUserIdAndActiveFalseOrderByCreatedAtDesc(
                        sessionId, userId
                ).orElse(null);

        if (stroke == null) {
            return ResponseEntity.noContent().build();
        }

        stroke.setActive(true);
        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       CLEAR SESSION
    --------------------------------------------- */
    @DeleteMapping("/session/{sessionId}")
    @Transactional
    public ResponseEntity<Void> clearSession(@PathVariable String sessionId) {
        repo.deleteBySessionId(sessionId);
        return ResponseEntity.noContent().build();
    }
}
