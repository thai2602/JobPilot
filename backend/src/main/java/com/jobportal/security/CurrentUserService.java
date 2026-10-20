package com.jobportal.security;

import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

/**
 * Resolves the user behind the current request from the SecurityContext (populated by
 * JwtAuthenticationFilter). Never trust a userId coming from the path or request body.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    /** Id of the authenticated user, or empty for anonymous requests. */
    public Optional<Long> currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof CustomUserDetails principal)) {
            return Optional.empty();
        }
        return Optional.ofNullable(principal.getId());
    }

    /** Id of the authenticated user; responds 401 when anonymous. */
    public Long requireUserId() {
        return currentUserId().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    /** Authenticated user entity, or empty for anonymous requests. */
    public Optional<User> currentUser() {
        return currentUserId().flatMap(userRepository::findById);
    }

    /** Authenticated user entity; responds 401 when anonymous or the account no longer exists. */
    public User requireUser() {
        return currentUser().orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
