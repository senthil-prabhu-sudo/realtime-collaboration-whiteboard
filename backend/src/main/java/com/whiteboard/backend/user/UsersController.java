package com.whiteboard.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
public class UsersController {

    private final UserRepository repo;

    public UsersController(UserRepository repo) {
        this.repo = repo;
    }

    /* ---------------------------------------------
       GET /users/me
       Current authenticated user
    --------------------------------------------- */
    @GetMapping("/me")
    public UserProfileResponse me(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        String userId = (String) authentication.getPrincipal();

        User user = repo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        // ✅ UPDATED MAPPING LOGIC
        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getAvatarUrl()
        );
    }

    /* ---------------------------------------------
       POST /users/batch
       Resolve many users in one call
    --------------------------------------------- */
    @PostMapping("/batch")
    public List<UserProfileResponse> batch(
            @RequestBody UserBatchRequest req,
            Authentication authentication
    ) {
        // Require authentication for privacy
        if (authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        if (req.ids() == null || req.ids().isEmpty()) {
            return List.of();
        }

        // Get found users
        List<User> foundUsers = repo.findAllById(req.ids());

        // Create responses for all requested ids
        return req.ids().stream()
                .distinct()
                .map(id -> {
                    User user = foundUsers.stream()
                            .filter(u -> u.getId().equals(id))
                            .findFirst()
                            .orElse(null);
                    if (user != null) {
                        return new UserProfileResponse(
                                user.getId(),
                                user.getEmail(),
                                user.getDisplayName() != null ? user.getDisplayName() : user.getEmail(),
                                user.getAvatarUrl()
                        );
                    } else {
                        // For unknown users (e.g., anonymous), return default
                        return new UserProfileResponse(
                                id,
                                null,
                                "Anonymous",
                                null
                        );
                    }
                })
                .collect(Collectors.toList());
    }
}
