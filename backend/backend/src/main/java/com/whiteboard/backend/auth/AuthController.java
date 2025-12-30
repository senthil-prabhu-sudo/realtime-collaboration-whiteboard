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
@CrossOrigin(origins = "http://localhost:5173")
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
            @Valid @RequestBody LoginRequest req
    ) {

        if (repo.findByEmail(req.email()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEmail(req.email());
        user.setPassword(encoder.encode(req.password()));

        repo.save(user);

        String token = jwt.generateToken(user.getId());

        return ResponseEntity.status(HttpStatus.CREATED).body(
                new AuthResponse(
                        token,
                        new AuthResponse.AuthUser(
                                user.getId(),
                                user.getEmail()
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

        User user = repo.findByEmail(req.email()).orElse(null);

        if (user == null || !encoder.matches(req.password(), user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String token = jwt.generateToken(user.getId());

        return ResponseEntity.ok(
                new AuthResponse(
                        token,
                        new AuthResponse.AuthUser(
                                user.getId(),
                                user.getEmail()
                        )
                )
        );
    }
}
