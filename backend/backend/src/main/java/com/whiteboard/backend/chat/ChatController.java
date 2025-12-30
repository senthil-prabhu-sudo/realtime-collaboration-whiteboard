package com.whiteboard.backend.chat;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/chat")
@CrossOrigin(origins = "http://localhost:5173")
public class ChatController {

    private final ChatRepository repo;

    public ChatController(ChatRepository repo) {
        this.repo = repo;
    }

    /* ---------------------------------------------
       GET /chat/{sessionId}
    --------------------------------------------- */
    @GetMapping("/{sessionId}")
    public List<ChatMessage> messages(@PathVariable String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId required");
        }
        return repo.findBySessionId(sessionId);
    }

    /* ---------------------------------------------
       POST /chat
    --------------------------------------------- */
    @PostMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void send(
            Authentication authentication,
            @RequestBody ChatMessageRequest req
    ) {

        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        if (req.sessionId() == null || req.sessionId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionId required");
        }

        if (req.message() == null || req.message().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "message required");
        }

        String userId = (String) authentication.getPrincipal();

        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setSessionId(req.sessionId());
        msg.setUserId(userId);
        msg.setMessage(req.message());
        msg.setCreatedAt(Instant.now());

        repo.save(msg);
    }
}
