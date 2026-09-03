package com.jobportal.modules.auth;

import com.jobportal.modules.auth.payload.JwtAuthenticationResponse;
import com.jobportal.modules.auth.payload.LoginRequest;
import com.jobportal.modules.auth.payload.RegisterRequest;
import com.jobportal.modules.auth.payload.GoogleLoginRequest;
import com.jobportal.modules.user.Role;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.RoleRepository;
import com.jobportal.security.CustomUserDetails;
import com.jobportal.security.JwtTokenProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.annotation.Transactional;

import jakarta.validation.Valid;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthController(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    @Autowired
    private com.jobportal.modules.user.UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Value("${google.client-id:}")
    private String googleClientId;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/register")
    @Transactional
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        String normalizedEmail = registerRequest.getEmail().trim().toLowerCase();

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            return ResponseEntity.badRequest().body("Email is already taken!");
        }

        Role candidateRole = roleRepository.findByName("ROLE_CANDIDATE")
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName("ROLE_CANDIDATE");
                    return roleRepository.save(role);
                });

        com.jobportal.modules.user.User user = new com.jobportal.modules.user.User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        user.setAuthProvider("LOCAL");
        user.setStatus("ACTIVE");
        user.getRoles().add(candidateRole);
        userRepository.save(user);

        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);
            return ResponseEntity.ok(new JwtAuthenticationResponse(jwt));
        } catch (org.springframework.security.core.AuthenticationException ex) {
            return ResponseEntity.status(401).body("Sai email hoặc mật khẩu / Tài khoản chưa được đăng ký!");
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody GoogleLoginRequest request) {
        if (request.getIdToken() == null || request.getIdToken().isBlank()) {
            return ResponseEntity.badRequest().body("Thiếu Google idToken");
        }

        try {
            System.out.println("Đang xác thực Google token...");
            String encodedToken = URLEncoder.encode(request.getIdToken(), StandardCharsets.UTF_8);
            HttpRequest tokenInfoRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken))
                    .GET()
                    .build();

            HttpResponse<String> tokenInfoResponse = httpClient.send(tokenInfoRequest, HttpResponse.BodyHandlers.ofString());
            if (tokenInfoResponse.statusCode() != 200) {
                System.err.println("Google trả về lỗi: " + tokenInfoResponse.body());
                return ResponseEntity.status(401).body("Google token không hợp lệ hoặc đã hết hạn");
            }

            JsonNode tokenInfo = objectMapper.readTree(tokenInfoResponse.body());
            String email = tokenInfo.path("email").asText(null);
            String aud = tokenInfo.path("aud").asText("");
            String emailVerifiedRaw = tokenInfo.path("email_verified").asText("false");
            boolean emailVerified = "true".equalsIgnoreCase(emailVerifiedRaw);

            System.out.println("Google Email: " + email + ", aud: " + aud);

            if (email == null || !emailVerified) {
                return ResponseEntity.status(401).body("Không xác minh được email Google");
            }

            // Kiểm tra Client ID nếu có cấu hình
            if (googleClientId != null && !googleClientId.isBlank() && !googleClientId.equals(aud)) {
                System.err.println("Cảnh báo: Google Client ID không khớp! Cấu hình: " + googleClientId + ", Thực tế: " + aud);
                return ResponseEntity.status(401).body("Google client id không khớp");
            }

            User user = userRepository.findByEmail(email).orElseGet(() -> {
                System.out.println("Tạo người dùng mới từ Google: " + email);
                User newUser = new User();
                newUser.setEmail(email);
                newUser.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
                newUser.setAuthProvider("GOOGLE");
                newUser.setStatus("ACTIVE");
                return userRepository.save(newUser);
            });

            if (user.getAuthProvider() == null || user.getAuthProvider().isBlank()) {
                user.setAuthProvider("GOOGLE");
                userRepository.save(user);
            }

            CustomUserDetails userDetails = CustomUserDetails.create(user);
            Authentication authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);
            System.out.println("Đăng nhập Google thành công cho: " + email);
            return ResponseEntity.ok(new JwtAuthenticationResponse(jwt));
        } catch (Exception ex) {
            System.err.println("Lỗi xử lý đăng nhập Google: " + ex.getMessage());
            ex.printStackTrace();
            return ResponseEntity.status(500).body("Đăng nhập Google thất bại: " + ex.getMessage());
        }
    }
}
