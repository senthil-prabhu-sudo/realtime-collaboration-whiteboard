package com.whiteboard.backend.config;

import com.whiteboard.backend.auth.JwtUtil;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String WS_AUTH = "WS_AUTH";

    private final JwtUtil jwtUtil;

    public WebSocketAuthInterceptor(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();

        if (command == null) {
            return message;
        }

        /* ---------------------------------------------
           CONNECT → authenticate & persist principal
        --------------------------------------------- */
        if (StompCommand.CONNECT.equals(command)) {

            List<String> authHeaders =
                    accessor.getNativeHeader("Authorization");

            String userId;
            if (authHeaders == null || authHeaders.isEmpty()) {
                // Allow anonymous connections for drawing
                userId = "anonymous";
            } else {
                String token = authHeaders.get(0).replace("Bearer ", "");
                userId = jwtUtil.validate(token);
            }

            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            userId, null, List.of()
                    );

            Map<String, Object> sessionAttributes =
                    accessor.getSessionAttributes();

            if (sessionAttributes == null) {
                sessionAttributes = new HashMap<>();
                accessor.setSessionAttributes(sessionAttributes);
            }

            sessionAttributes.put(WS_AUTH, auth);
            accessor.setUser(auth);
        }

        /* ---------------------------------------------
           SEND → restore principal from session
        --------------------------------------------- */
        if (StompCommand.SEND.equals(command)) {

            Map<String, Object> sessionAttributes =
                    accessor.getSessionAttributes();

            if (sessionAttributes != null) {
                Object auth = sessionAttributes.get(WS_AUTH);
                if (auth instanceof UsernamePasswordAuthenticationToken token) {
                    accessor.setUser(token);
                }
            }
        }

        return message;
    }
}
