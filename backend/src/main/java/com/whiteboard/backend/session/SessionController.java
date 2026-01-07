package com.whiteboard.backend.session;

import com.whiteboard.backend.user.User;
import com.whiteboard.backend.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/sessions")
public class SessionController {

    private final SessionRepository sessionRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public SessionController(SessionRepository sessionRepo, UserRepository userRepo, SimpMessagingTemplate messagingTemplate) {
        this.sessionRepo = sessionRepo;
        this.userRepo = userRepo;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Helper method to safely extract userId from authentication
     * Returns null if user is not authenticated
     */
    private String getUserIdFromAuth(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        
        Object principal = authentication.getPrincipal();
        
        // Anonymous users
        if (principal instanceof String && "anonymousUser".equals(principal)) {
            return null;
        }
        
        // JWT authenticated users
        if (principal instanceof String) {
            return (String) principal;
        }
        
        return null;
    }

    /* ---------------------------------------------
       Get all sessions
    --------------------------------------------- */
    @GetMapping
    public List<BoardSession> all() {
        return sessionRepo.findAll();
    }

    /* ---------------------------------------------
       Get session by ID (PUBLIC - no auth required)
    --------------------------------------------- */
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable String id) {
        return sessionRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /* ---------------------------------------------
       Create session
    --------------------------------------------- */
    @PostMapping
    public ResponseEntity<CreateSessionResponse> create(
            @RequestBody CreateSessionRequest request, 
            Authentication authentication) {
        
        String creatorId = getUserIdFromAuth(authentication);

        // Allow anonymous creation only for public sessions
        if (creatorId == null && !request.isPublic()) {
            return ResponseEntity.status(401).body(null);
        }

        if (request.name() == null || request.name().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        BoardSession session = new BoardSession();
        session.setId(UUID.randomUUID().toString());
        session.setName(request.name());
        session.setCreatorId(creatorId);
        session.setIsPublic(request.isPublic());
        session.setAllowCollaborativeDrawing(false); // Default to false
        session.setCreatedAt(LocalDateTime.now());

        sessionRepo.save(session);

        return ResponseEntity.ok(
                new CreateSessionResponse(session.getId(), session.getName())
        );
    }

    /* ---------------------------------------------
       Toggle collaborative drawing
    --------------------------------------------- */
    @PostMapping("/{id}/toggle-collaborative-drawing")
    public ResponseEntity<?> toggleCollaborativeDrawing(
            @PathVariable String id, 
            Authentication authentication) {
        
        BoardSession session = sessionRepo.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        // Only creator can toggle
        String userId = getUserIdFromAuth(authentication);

        if (userId == null || !userId.equals(session.getCreatorId())) {
            return ResponseEntity.status(403).build(); // Forbidden
        }

        session.setAllowCollaborativeDrawing(!session.getAllowCollaborativeDrawing());
        sessionRepo.save(session);

        // Broadcast session update to all clients in the session
        Map<String, Object> updateMessage = new HashMap<>();
        updateMessage.put("type", "collaborative-drawing-toggled");
        updateMessage.put("allowCollaborativeDrawing", session.getAllowCollaborativeDrawing());

        messagingTemplate.convertAndSend("/topic/sessions/" + id, (Object) updateMessage);

        return ResponseEntity.ok().body(session.getAllowCollaborativeDrawing());
    }

    /* ---------------------------------------------
       Delete session
       - Authenticated users can delete sessions they created
       - Anyone can delete anonymously created sessions (creatorId == null)
    --------------------------------------------- */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(
            @PathVariable String id,
            Authentication authentication) {

        BoardSession session = sessionRepo.findById(id).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        // Get authenticated user ID (may be null for anonymous users)
        String userId = getUserIdFromAuth(authentication);

        // DEBUG: Log deletion attempt
        System.out.println("[DELETE SESSION] Session ID: " + id);
        System.out.println("[DELETE SESSION] Session Creator: " + session.getCreatorId());
        System.out.println("[DELETE SESSION] Current User: " + userId);
        System.out.println("[DELETE SESSION] Is Anonymous Session: " + (session.getCreatorId() == null));
        System.out.println("[DELETE SESSION] Is Creator Match: " + (userId != null && userId.equals(session.getCreatorId())));

        // Allow deletion if:
        // 1. Session was created anonymously (null creator) - anyone can delete
        // 2. User is authenticated AND is the creator
        boolean canDelete = (session.getCreatorId() == null) ||
                           (userId != null && userId.equals(session.getCreatorId()));

        System.out.println("[DELETE SESSION] Can Delete: " + canDelete);

        if (!canDelete) {
            return ResponseEntity.status(403)
                    .body(Map.of(
                        "error", "Forbidden",
                        "message", "You don't have permission to delete this session",
                        "sessionCreator", session.getCreatorId(),
                        "currentUser", userId
                    ));
        }

        sessionRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /* ---------------------------------------------
       TEST ENDPOINT (DEBUGGING)
    --------------------------------------------- */
    @GetMapping("/test")
    public ResponseEntity<String> test() {
        return ResponseEntity.ok("Backend is working!");
    }

    /* ---------------------------------------------
       HEALTH CHECK ENDPOINT (Railway)
    --------------------------------------------- */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }
}