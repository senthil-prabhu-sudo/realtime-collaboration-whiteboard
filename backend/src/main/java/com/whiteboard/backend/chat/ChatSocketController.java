package com.whiteboard.backend.chat;

import jakarta.transaction.Transactional;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.Instant;
import java.util.UUID;

@Controller
@MessageMapping("/chat")
public class ChatSocketController {

    private final SimpMessagingTemplate messaging;
    private final ChatRepository repo;

    public ChatSocketController(
            SimpMessagingTemplate messaging,
            ChatRepository repo
    ) {
        this.messaging = messaging;
        this.repo = repo;
    }

    /**
     * Client sends to: /app/chat/{sessionId}
     * Clients subscribe to: /topic/chat/{sessionId}
     */
    @Transactional
    @MessageMapping("/{sessionId}")
    public void send(
            @DestinationVariable String sessionId,
            @Payload ChatMessageRequest incoming,
            Principal principal
    ) {
        System.out.println("[ChatSocket] 🚀 Controller HIT - session=" + sessionId);

        if (principal == null) {
            System.out.println("[ChatSocket] ❌ Principal is null");
            return;
        }

        if (incoming == null || incoming.getMessage() == null || incoming.getMessage().isBlank()) {
            System.out.println("[ChatSocket] ❌ Empty or invalid payload");
            return;
        }

        String userId = principal.getName();
        System.out.println("[ChatSocket] User=" + userId + ", message=" + incoming.getMessage());

        ChatMessage msg = new ChatMessage();
        msg.setId(UUID.randomUUID().toString());
        msg.setSessionId(sessionId);
        msg.setUserId(userId);
        msg.setMessage(incoming.getMessage());
        msg.setCreatedAt(Instant.now());

        ChatMessage saved = repo.saveAndFlush(msg);
        System.out.println("[ChatSocket] 💾 Saved chat message id=" + saved.getId());

        messaging.convertAndSend(
                "/topic/chat/" + sessionId,
                saved
        );

        System.out.println("[ChatSocket] ✅ Broadcast complete");
    }
}
