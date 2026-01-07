package com.whiteboard.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Enumeration;

@RestController
@RequestMapping("/debug")
@CrossOrigin(origins = "*") // Allow all origins for debugging
public class DebugController {

    /**
     * Simple test endpoint to verify the server is responding
     */
    @GetMapping("/test")
    public ResponseEntity<?> test() {
        return ResponseEntity.ok(Map.of(
                "status", "ok",
                "message", "Debug endpoint working - server is alive!",
                "timestamp", System.currentTimeMillis()
        ));
    }

    /**
     * Check authentication status
     */
    @GetMapping("/auth-info")
    public ResponseEntity<?> authInfo(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        Map<String, Object> info = new HashMap<>();
        info.put("authenticated", auth != null && auth.isAuthenticated());
        info.put("authType", auth != null ? auth.getClass().getSimpleName() : "none");
        info.put("principal", auth != null ? auth.getPrincipal().toString() : null);
        info.put("authorities", auth != null ? auth.getAuthorities().toString() : null);
        info.put("hasAuthHeader", request.getHeader("Authorization") != null);
        info.put("method", request.getMethod());
        info.put("path", request.getRequestURI());

        return ResponseEntity.ok(info);
    }

    /**
     * Dump all request headers
     */
    @GetMapping("/headers")
    public ResponseEntity<?> headers(HttpServletRequest request) {
        Map<String, String> headers = new HashMap<>();
        Enumeration<String> headerNames = request.getHeaderNames();

        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            headers.put(headerName, request.getHeader(headerName));
        }

        return ResponseEntity.ok(Map.of(
                "headers", headers,
                "method", request.getMethod(),
                "uri", request.getRequestURI()
        ));
    }

    /**
     * Simulate sessions endpoint to test routing
     */
    @GetMapping("/sessions-test")
    public ResponseEntity<?> sessionsTest() {
        return ResponseEntity.ok(Map.of(
                "message", "This simulates /sessions endpoint",
                "working", true,
                "note", "If this works but /sessions doesn't, the issue is in SessionController"
        ));
    }

    /**
     * Test CORS preflight
     */
    @RequestMapping(value = "/cors-test", method = RequestMethod.OPTIONS)
    public ResponseEntity<?> corsTest() {
        return ResponseEntity.ok(Map.of("cors", "preflight OK"));
    }

    /**
     * Echo back any request details
     */
    @GetMapping("/echo")
    public ResponseEntity<?> echo(HttpServletRequest request) {
        Map<String, Object> details = new HashMap<>();
        details.put("method", request.getMethod());
        details.put("path", request.getRequestURI());
        details.put("queryString", request.getQueryString());
        details.put("remoteAddr", request.getRemoteAddr());
        details.put("serverName", request.getServerName());
        details.put("serverPort", request.getServerPort());
        details.put("scheme", request.getScheme());

        return ResponseEntity.ok(details);
    }
}