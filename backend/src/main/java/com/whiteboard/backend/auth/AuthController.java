package com.whiteboard.backend.auth;

import com.whiteboard.backend.user.User;
import com.whiteboard.backend.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserRepository repo;
    private final JwtUtil jwt;
    private final PasswordEncoder encoder;

    public AuthController(
            UserRepository repo,
            JwtUtil jwt,
            PasswordEncoder encoder
    ) {
        this.repo = repo;
        this.jwt = jwt;
        this.encoder = encoder;
    }

    // =========================
    // SIGNUP / REGISTER
    // =========================
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> signup(
            @Valid @RequestBody SignUpRequest req
    ) {

        if (repo.findByEmail(req.email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(req.email());
        user.setDisplayName(req.displayName());
        user.setPassword(encoder.encode(req.password()));

        repo.save(user);

        // ✅ JWT MUST USE USER ID (NOT EMAIL)
        String token = jwt.generateToken(user.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(
                new AuthResponse(
                        token,
                        new AuthResponse.AuthUser(
                                user.getId(),
                                user.getEmail(),
                                user.getDisplayName()
                        )
                )
        );
    }

    // =========================
    // LOGIN
    // =========================
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest req
    ) {
        try {
            System.out.println("DEBUG: Login attempt for email: " + req.email());

            User user = repo.findByEmail(req.email()).orElse(null);
            System.out.println("DEBUG: User found: " + (user != null ? "YES" : "NO"));

            if (user == null) {
                System.out.println("DEBUG: User not found for email: " + req.email());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            System.out.println("DEBUG: User password exists: " + (user.getPassword() != null ? "YES" : "NO"));

            boolean passwordMatches = encoder.matches(req.password(), user.getPassword());
            System.out.println("DEBUG: Password matches: " + passwordMatches);

            if (!passwordMatches) {
                System.out.println("DEBUG: Password mismatch for user: " + req.email());
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            // ✅ JWT MUST USE USER ID (NOT EMAIL)
            String token = jwt.generateToken(user.getId());
            System.out.println("DEBUG: Login successful for user: " + req.email());

            return ResponseEntity.ok(
                    new AuthResponse(
                            token,
                            new AuthResponse.AuthUser(
                                    user.getId(),
                                    user.getEmail(),
                                    user.getDisplayName()
                            )
                    )
            );
        } catch (Exception e) {
            System.err.println("DEBUG: Exception during login: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


}
