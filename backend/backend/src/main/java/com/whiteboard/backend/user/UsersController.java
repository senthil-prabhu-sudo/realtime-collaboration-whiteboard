package com.whiteboard.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "http://localhost:5173")
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
            @RequestBody UserBatchRequest req
    ) {
        if (req.ids() == null || req.ids().isEmpty()) {
            return List.of();
        }

        // ✅ UPDATED MAPPING LOGIC
        return repo.findAllById(req.ids())
                .stream()
                .map(u -> new UserProfileResponse(
                        u.getId(),
                        u.getEmail(),
                        u.getDisplayName(),
                        u.getAvatarUrl()
                ))
                .collect(Collectors.toList());
    }
}
