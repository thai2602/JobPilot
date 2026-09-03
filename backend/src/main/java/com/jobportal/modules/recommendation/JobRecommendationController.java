package com.jobportal.modules.recommendation;

import com.jobportal.modules.recommendation.dto.JobContextView;
import com.jobportal.modules.recommendation.dto.JobRecommendationResult;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class JobRecommendationController {

    private final JobRecommendationService recommendationService;
    private final UserRepository userRepository;

    @GetMapping("/jobs")
    public ResponseEntity<JobRecommendationResult> recommendJobs(
            @RequestParam Long cvId,
            @RequestParam(defaultValue = "10") int limit) {
        User user = authenticatedUser();
        if (user == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(recommendationService.recommendForCv(cvId, user.getId(), limit));
    }

    @GetMapping("/context")
    public ResponseEntity<List<JobContextView>> getJobContext(
            @RequestParam(required = false) String keywords,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String jobLevel,
            @RequestParam(defaultValue = "8") int limit) {
        if (authenticatedUser() == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(recommendationService.searchOpenJobContext(keywords, location, jobLevel, limit));
    }

    private User authenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        return userRepository.findByEmail(authentication.getName()).orElse(null);
    }
}
