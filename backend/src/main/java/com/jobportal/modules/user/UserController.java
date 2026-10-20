package com.jobportal.modules.user;

import com.jobportal.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final CurrentUserService currentUserService;

    /**
     * Thông tin cơ bản của người dùng đang đăng nhập (lấy từ JWT).
     * Thay thế endpoint /by-email cũ vốn cho phép dò email của người khác.
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser() {
        User user = currentUserService.requireUser();
        return ResponseEntity.ok(Map.of("userId", user.getId(), "email", user.getEmail()));
    }
}
