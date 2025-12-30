package com.whiteboard.backend.stroke;

import com.whiteboard.backend.session.BoardSession;
import com.whiteboard.backend.session.SessionRepository;
import com.whiteboard.backend.user.User;
import com.whiteboard.backend.user.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/strokes")
@CrossOrigin(origins = "http://localhost:5173")
public class StrokeController {

    private final StrokeRepository strokeRepo;
    private final SessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public StrokeController(StrokeRepository strokeRepo, SessionRepository sessionRepo, UserRepository userRepo, SimpMessagingTemplate messagingTemplate) {
        this.strokeRepo = strokeRepo;
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
        this.messagingTemplate = messagingTemplate;
    }

    /* ---------------------------------------------
       POST /strokes
       Single-stroke insert
    --------------------------------------------- */
    @PostMapping
    public ResponseEntity<java.util.Map<String, String>> create(
            Authentication authentication,
            @RequestBody CreateStrokeRequest req
    ) {
        try {
            if (req == null || req.sessionId() == null || req.sessionId().isBlank()) {
                return ResponseEntity.badRequest().build();
            }

            // Extract user ID properly (JWT filter sets principal as userId)
            String userId = null;
            if (authentication != null && authentication.getPrincipal() != null) {
                userId = (String) authentication.getPrincipal();
            } else {
                userId = "anonymous";
            }

            // Check drawing permissions
            BoardSession session = sessionRepo.findById(req.sessionId()).orElse(null);
            if (session == null) {
                System.out.println("DEBUG: Session not found: " + req.sessionId());
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }

            System.out.println("DEBUG: Session creatorId: " + session.getCreatorId());
            System.out.println("DEBUG: Current userId: " + userId);
            System.out.println("DEBUG: Collaborative drawing: " + session.getAllowCollaborativeDrawing());

            boolean canDraw = (session.getCreatorId() != null && session.getCreatorId().equals(userId)) // User is session creator
                || (session.getAllowCollaborativeDrawing() != null && session.getAllowCollaborativeDrawing()) // Collaborative drawing enabled
                || session.getCreatorId() == null; // Anonymous session - anyone can draw

            System.out.println("DEBUG: Can draw: " + canDraw);

            if (!canDraw) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Stroke stroke = new Stroke();
            String strokeId = UUID.randomUUID().toString();
            stroke.setId(strokeId);
            stroke.setSessionId(req.sessionId());
            stroke.setUserId(userId);
            stroke.setCreatedAt(Instant.now());
            stroke.setStrokeData(StrokeData.from(req).toJson());
            stroke.setActive(true);

            strokeRepo.save(stroke);

            // Broadcast to all clients in the session
            messagingTemplate.convertAndSend("/topic/strokes/" + req.sessionId(), stroke);

            // Return the created stroke ID
            return ResponseEntity.ok(java.util.Map.of("id", strokeId));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /* ---------------------------------------------
       POST /strokes/batch
    --------------------------------------------- */
    @PostMapping("/batch")
    @Transactional
    public ResponseEntity<Void> createBatch(
            Authentication authentication,
            @RequestBody StrokeBatchRequest req
    ) {
        if (req == null || req.sessionId() == null || req.strokes() == null) {
            return ResponseEntity.badRequest().build();
        }

        // Extract user ID properly (JWT filter sets principal as userId)
        String userId = null;
        if (authentication != null && authentication.getPrincipal() != null) {
            userId = (String) authentication.getPrincipal();
        } else {
            userId = "anonymous";
        }

        // Check drawing permissions
        BoardSession session = sessionRepo.findById(req.sessionId()).orElse(null);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        boolean canDraw = (session.getCreatorId() != null && session.getCreatorId().equals(userId)) // User is session creator
            || (session.getAllowCollaborativeDrawing() != null && session.getAllowCollaborativeDrawing()) // Collaborative drawing enabled
            || session.getCreatorId() == null; // Anonymous session - anyone can draw

        if (!canDraw) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        for (StrokeMessage raw : req.strokes()) {
            try {
                StrokeMessage msg = raw.normalized();
                if (msg.points().isEmpty()) continue;

                Stroke stroke = new Stroke();
                stroke.setId(UUID.randomUUID().toString());
                stroke.setSessionId(req.sessionId());
                stroke.setUserId(userId);
                stroke.setCreatedAt(Instant.now());
                stroke.setStrokeData(StrokeData.from(msg).toJson());
                stroke.setActive(true);

                strokeRepo.save(stroke);

                // Broadcast to all clients in the session
                messagingTemplate.convertAndSend("/topic/strokes/" + req.sessionId(), stroke);

            } catch (Exception e) {
                System.err.println("❌ Failed to persist stroke batch item");
                e.printStackTrace();
                throw e;
            }
        }

        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       ✅ FIXED: GET /strokes/{sessionId}
       (THIS IS WHAT YOUR FRONTEND CALLS)
    --------------------------------------------- */
    @GetMapping("/{sessionId}")
    public List<Stroke> getBySession(@PathVariable String sessionId) {
        return strokeRepo.findBySessionIdAndActiveTrueOrderByCreatedAtAsc(sessionId);
    }

    /* ---------------------------------------------
       OPTIONAL: Backward-compatible alias
    --------------------------------------------- */
    @GetMapping("/session/{sessionId}")
    public List<Stroke> getBySessionAlias(@PathVariable String sessionId) {
        return strokeRepo.findBySessionIdAndActiveTrueOrderByCreatedAtAsc(sessionId);
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

        // Extract user ID properly (JWT filter sets principal as userId)
        String userId = null;
        if (authentication.getPrincipal() != null) {
            userId = (String) authentication.getPrincipal();
        }

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<Stroke> strokes =
                strokeRepo.findBySessionIdAndUserIdAndActiveTrueOrderByCreatedAtDesc(
                        sessionId, userId
                );

        if (strokes.isEmpty()) {
            return ResponseEntity.noContent().build();
        }

        strokes.get(0).setActive(false);

        // Broadcast the updated stroke
        messagingTemplate.convertAndSend("/topic/strokes/" + sessionId, strokes.get(0));

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

        // Extract user ID properly (JWT filter sets principal as userId)
        String userId = null;
        if (authentication.getPrincipal() != null) {
            userId = (String) authentication.getPrincipal();
        }

        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Stroke stroke =
                strokeRepo.findTopBySessionIdAndUserIdAndActiveFalseOrderByCreatedAtDesc(
                        sessionId, userId
                ).orElse(null);

        if (stroke == null) {
            return ResponseEntity.noContent().build();
        }

        stroke.setActive(true);

        // Broadcast the updated stroke
        messagingTemplate.convertAndSend("/topic/strokes/" + sessionId, stroke);

        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       UPDATE STROKE (for move/select tool)
    --------------------------------------------- */
    @PutMapping("/{strokeId}")
    @Transactional
    public ResponseEntity<Void> updateStroke(
            @PathVariable String strokeId,
            @RequestBody CreateStrokeRequest req,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userId = (String) authentication.getPrincipal();

        Stroke stroke = strokeRepo.findById(strokeId).orElse(null);
        if (stroke == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        // Check if user has permission to update (owner or creator of stroke)
        BoardSession session = sessionRepo.findById(stroke.getSessionId()).orElse(null);
        if (session == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        boolean canUpdate = (session.getCreatorId() != null && session.getCreatorId().equals(userId))
            || (stroke.getUserId() != null && stroke.getUserId().equals(userId))
            || (session.getAllowCollaborativeDrawing() != null && session.getAllowCollaborativeDrawing());

        if (!canUpdate) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        // Update stroke data
        stroke.setStrokeData(StrokeData.from(req).toJson());
        strokeRepo.save(stroke);

        // Broadcast the updated stroke to all clients in the session
        messagingTemplate.convertAndSend("/topic/strokes/" + stroke.getSessionId(), stroke);

        return ResponseEntity.ok().build();
    }

    /* ---------------------------------------------
       CLEAR SESSION
    --------------------------------------------- */
    @DeleteMapping("/session/{sessionId}")
    @Transactional
    public ResponseEntity<Void> clearSession(@PathVariable String sessionId) {
        List<Stroke> strokes = strokeRepo.findBySessionIdAndActiveTrueOrderByCreatedAtAsc(sessionId);
        for (Stroke s : strokes) {
            s.setActive(false);
        }
        strokeRepo.saveAll(strokes);

        // Broadcast each deactivated stroke
        for (Stroke s : strokes) {
            messagingTemplate.convertAndSend("/topic/strokes/" + sessionId, s);
        }

        return ResponseEntity.noContent().build();
    }
}
