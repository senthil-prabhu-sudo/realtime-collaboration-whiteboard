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
@CrossOrigin(origins = "http://localhost:5173")
public class PresenceController {

    private final PresenceRepository repo;

    public PresenceController(PresenceRepository repo) {
        this.repo = repo;
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
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication required"
            );
        }

        // ✅ Custom JWT filter sets principal as String
        String userId = (String) authentication.getPrincipal();

        Presence presence = new Presence();
        presence.setSessionId(req.sessionId());
        presence.setUserId(userId);
        // lastSeen handled automatically by @PrePersist/@PreUpdate

        repo.save(presence);
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
    }
}
