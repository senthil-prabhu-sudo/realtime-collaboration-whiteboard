package com.whiteboard.backend.session;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/sessions")
@CrossOrigin(origins = "http://localhost:5173")
public class SessionController {

    private final SessionRepository repo;

    public SessionController(SessionRepository repo) {
        this.repo = repo;
    }

    /* ---------------------------------------------
       Get all sessions
    --------------------------------------------- */
    @GetMapping
    public List<BoardSession> all() {
        return repo.findAll();
    }

    /* ---------------------------------------------
       Get session by ID (REQUIRED)
    --------------------------------------------- */
    @GetMapping("/{id}")
    public ResponseEntity<BoardSession> getById(@PathVariable String id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /* ---------------------------------------------
       Create session
    --------------------------------------------- */
    @PostMapping
    public ResponseEntity<CreateSessionResponse> create(
            Authentication authentication,
            @RequestBody CreateSessionRequest request
    ) {
        String userId = (String) authentication.getPrincipal();

        if (request.name() == null || request.name().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        BoardSession session = new BoardSession();
        session.setId(UUID.randomUUID().toString());
        session.setName(request.name());
        session.setCreatorId(userId);
        session.setIsPublic(false);

        repo.save(session);

        return ResponseEntity.ok(
                new CreateSessionResponse(session.getId())
        );
    }

    /* ---------------------------------------------
       Delete session
    --------------------------------------------- */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
