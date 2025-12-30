package com.whiteboard.backend.stroke;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.time.Instant;
import java.util.UUID;

@Controller
public class StrokeSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final StrokeRepository repo;

    public StrokeSocketController(
            SimpMessagingTemplate messagingTemplate,
            StrokeRepository repo
    ) {
        this.messagingTemplate = messagingTemplate;
        this.repo = repo;
    }

    /**
     * Client sends to:
     *   /app/strokes/{sessionId}
     *
     * Clients subscribe to:
     *   /topic/strokes/{sessionId}
     */
    @MessageMapping("/strokes/{sessionId}")
    public void receiveStroke(
            @DestinationVariable String sessionId,
            StrokeMessage message,
            Authentication authentication
    ) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return; // ignore unauthenticated messages
        }

        String userId = authentication.getPrincipal().toString();

        Stroke stroke = new Stroke();
        stroke.setId(UUID.randomUUID().toString());
        stroke.setSessionId(sessionId);
        stroke.setUserId(userId);
        stroke.setCreatedAt(Instant.now());

        // ✅ Correct serialization path
        stroke.setStrokeData(
                StrokeData.from(message).toJson()
        );

        stroke.setActive(true);

        repo.save(stroke);

        // Broadcast to everyone in the session
        messagingTemplate.convertAndSend(
                "/topic/strokes/" + sessionId,
                stroke
        );
    }
}
