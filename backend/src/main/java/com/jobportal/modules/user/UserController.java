package com.jobportal.modules.user;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;

    /**
     * Tra cứu userId từ email — dùng cho luồng lưu CV (Phương án A).
     * Frontend gửi email của người dùng đang đăng nhập (lấy từ localStorage)
     * để lấy về userId trước khi gọi POST /api/cvs.
     */
    @GetMapping("/by-email")
    public ResponseEntity<?> getUserByEmail(@RequestParam String email) {
        return userRepository.findByEmail(email)
                .map(user -> ResponseEntity.ok(Map.of("userId", user.getId(), "email", user.getEmail())))
                .orElse(ResponseEntity.notFound().build());
    }
}
