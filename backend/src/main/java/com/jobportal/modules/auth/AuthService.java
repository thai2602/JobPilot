package com.jobportal.modules.auth;

import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.UnauthorizedException;
import com.jobportal.modules.auth.payload.JwtAuthenticationResponse;
import com.jobportal.modules.auth.payload.LoginRequest;
import com.jobportal.modules.auth.payload.RegisterRequest;
import com.jobportal.modules.user.Role;
import com.jobportal.modules.user.RoleRepository;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserRepository;
import com.jobportal.security.CustomUserDetails;
import com.jobportal.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    static final String CANDIDATE_ROLE = "ROLE_CANDIDATE";

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final GoogleTokenVerifier googleTokenVerifier;

    @Transactional
    public void register(RegisterRequest request) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new BadRequestException("Email is already taken!");
        }

        Role candidateRole = roleRepository.findByName(CANDIDATE_ROLE)
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(CANDIDATE_ROLE);
                    return roleRepository.save(role);
                });

        User user = new User();
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setAuthProvider("LOCAL");
        user.setStatus("ACTIVE");
        user.getRoles().add(candidateRole);
        userRepository.save(user);
    }

    public JwtAuthenticationResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
            return issueToken(authentication);
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException("Sai email hoặc mật khẩu / Tài khoản chưa được đăng ký!");
        }
    }

    /** Signs in (and on first use, registers) the owner of a verified Google ID token. */
    @Transactional
    public JwtAuthenticationResponse loginWithGoogle(String idToken) {
        String email = googleTokenVerifier.verifyAndGetEmail(idToken);

        User user = userRepository.findByEmail(email).orElseGet(() -> {
            log.info("Creating user from Google sign-in");
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
        return issueToken(new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities()));
    }

    private JwtAuthenticationResponse issueToken(Authentication authentication) {
        SecurityContextHolder.getContext().setAuthentication(authentication);
        return new JwtAuthenticationResponse(tokenProvider.generateToken(authentication));
    }
}
