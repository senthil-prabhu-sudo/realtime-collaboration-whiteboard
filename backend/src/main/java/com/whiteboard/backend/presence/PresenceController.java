package com.whiteboard.backend.presence;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/presence")
public class PresenceController {

    private final PresenceRepository repo;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public PresenceController(PresenceRepository repo, org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.repo = repo;
        this.messagingTemplate = messagingTemplate;
    }

    /* ---------------------------------------------
       POST /presence/upsert
       Heartbeat (JWT REQUIRED)
    --------------------------------------------- */
    @PostMapping("/upsert")
    @Transactional
    public void upsert(
            Authentication authentication,
            @Valid @RequestBody PresenceUpsertRequest req
    ) {
        // ✅ HARD GUARD — prevents NullPointerException → 500
        if (authentication == null || authentication.getPrincipal() == null) {
            System.err.println("❌ Presence upsert failed: Authentication is null or principal is null");
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        // ✅ Custom JWT filter sets principal as String
        String userId = (String) authentication.getPrincipal();
        
        // Additional validation
        if (userId == null || userId.isBlank()) {
            System.err.println("❌ Presence upsert failed: userId is null or blank");
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid user ID"
            );
        }
        
        if (req.sessionId() == null || req.sessionId().isBlank()) {
            System.err.println("❌ Presence upsert failed: sessionId is null or blank");
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid session ID"
            );
        }

        System.out.println("✅ Presence upsert - userId: " + userId + ", sessionId: " + req.sessionId());

        try {
            Presence presence = new Presence();
            presence.setSessionId(req.sessionId());
            presence.setUserId(userId);
            // lastSeen handled automatically by @PrePersist/@PreUpdate

            repo.save(presence);

            // Broadcast updated presence list
            List<Presence> updatedList = repo.findBySessionId(req.sessionId());
            messagingTemplate.convertAndSend("/topic/presence/" + req.sessionId(), updatedList);

            System.out.println("✅ Presence saved successfully");
        } catch (Exception e) {
            System.err.println("❌ Failed to save presence: " + e.getMessage());
            e.printStackTrace();
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to update presence: " + e.getMessage()
            );
        }
    }

    /* ---------------------------------------------
       GET /presence/{sessionId}
       List online users in a session
    --------------------------------------------- */
    @GetMapping("/{sessionId}")
    public List<Presence> getBySession(@PathVariable String sessionId) {
        return repo.findBySessionId(sessionId);
    }

    /* ---------------------------------------------
       DELETE /presence/{sessionId}
       Cleanup on leave (IDEMPOTENT)
    --------------------------------------------- */
    @DeleteMapping("/{sessionId}")
    @Transactional
    public void delete(
            Authentication authentication,
            @PathVariable String sessionId
    ) {
        if (authentication == null || authentication.getPrincipal() == null) {
            // idempotent — silently ignore
            return;
        }

        String userId = (String) authentication.getPrincipal();
        repo.deleteBySessionIdAndUserId(sessionId, userId);

        // Broadcast updated presence list
        List<Presence> updatedList = repo.findBySessionId(sessionId);
        messagingTemplate.convertAndSend("/topic/presence/" + sessionId, updatedList);
    }
}
