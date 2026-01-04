package com.whiteboard.backend.chat;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/chat")
public class ChatController {

    private final ChatRepository repo;
    private final org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate;

    public ChatController(ChatRepository repo, org.springframework.messaging.simp.SimpMessagingTemplate messagingTemplate) {
        this.repo = repo;
        this.messagingTemplate = messagingTemplate;
    }

    /* ---------------------------------------------
       GET chat history
    --------------------------------------------- */
    @GetMapping("/{sessionId}")
    public List<ChatMessage> messages(@PathVariable String sessionId) {
        return repo.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    /* ---------------------------------------------
       POST chat message (REST fallback)
    --------------------------------------------- */
    @PostMapping("/{sessionId}")
    public ResponseEntity<Void> send(
            @PathVariable String sessionId,
            @RequestBody ChatMessageRequest incoming,
            Principal principal
    ) {
        if (incoming == null
                || incoming.getMessage() == null
                || incoming.getMessage().isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String userId = (principal != null) ? principal.getName() : "anonymous";

        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setSessionId(sessionId);   // ✅ from URL
        msg.setUserId(userId);
        msg.setMessage(incoming.getMessage());
        msg.setCreatedAt(Instant.now());

        ChatMessage saved = repo.save(msg);

        // Broadcast to all clients in the session
        messagingTemplate.convertAndSend("/topic/chat/" + sessionId, saved);

        return ResponseEntity.ok().build();
    }
}
