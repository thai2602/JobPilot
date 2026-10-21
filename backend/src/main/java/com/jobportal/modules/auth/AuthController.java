package com.jobportal.modules.auth;

import com.jobportal.modules.auth.payload.GoogleLoginRequest;
import com.jobportal.modules.auth.payload.JwtAuthenticationResponse;
import com.jobportal.modules.auth.payload.LoginRequest;
import com.jobportal.modules.auth.payload.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    /** Plain-text body: the frontend reads it with responseType "text". */
    @PostMapping("/register")
    public ResponseEntity<String> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        authService.register(registerRequest);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public JwtAuthenticationResponse authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        return authService.login(loginRequest);
    }

    @PostMapping("/google")
    public JwtAuthenticationResponse authenticateWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.loginWithGoogle(request.getIdToken());
    }
}
