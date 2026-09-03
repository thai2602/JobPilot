package com.jobportal.modules.application;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserRepository;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import java.util.List;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.Authentication;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "*")
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;

    public ApplicationController(ApplicationRepository applicationRepository, UserRepository userRepository, JobRepository jobRepository) {
        this.applicationRepository = applicationRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            return null;
        }
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    @GetMapping
    public ResponseEntity<List<Application>> getMyApplications() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(applicationRepository.findByUserIdOrderByAppliedAtDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> applyForJob(@RequestBody ApplicationRequest req) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body("Chưa đăng nhập");
        
        if (applicationRepository.existsByUserIdAndJobId(user.getId(), req.getJobId())) {
            return ResponseEntity.badRequest().body("Bạn đã ứng tuyển công việc này rồi");
        }

        Job job = jobRepository.findById(req.getJobId()).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();

        Application app = new Application();
        app.setUser(user);
        app.setJob(job);
        app.setCvId(req.getCvId());
        app.setStatus("PENDING");
        applicationRepository.save(app);

        return ResponseEntity.ok(app);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApplication(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        Application app = applicationRepository.findById(id).orElse(null);
        if (app != null && app.getUser().getId().equals(user.getId())) {
            applicationRepository.delete(app);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
