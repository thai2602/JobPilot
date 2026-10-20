package com.jobportal.modules.application;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.jobportal.modules.cv.UserCvRepository;
import com.jobportal.modules.user.User;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.security.CurrentUserService;
import java.util.List;

@RestController
@RequestMapping("/api/applications")
@CrossOrigin(origins = "*")
public class ApplicationController {

    private final ApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserCvRepository userCvRepository;
    private final CurrentUserService currentUserService;

    public ApplicationController(ApplicationRepository applicationRepository, JobRepository jobRepository,
                                 UserCvRepository userCvRepository, CurrentUserService currentUserService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userCvRepository = userCvRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<ApplicationResponse>> getMyApplications() {
        User user = currentUserService.currentUser().orElse(null);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(applicationRepository.findByUserIdOrderByAppliedAtDesc(user.getId()).stream()
                .map(ApplicationResponse::from)
                .toList());
    }

    @PostMapping
    public ResponseEntity<?> applyForJob(@RequestBody ApplicationRequest req) {
        User user = currentUserService.currentUser().orElse(null);
        if (user == null) return ResponseEntity.status(401).body("Chưa đăng nhập");
        
        if (applicationRepository.existsByUserIdAndJobId(user.getId(), req.getJobId())) {
            return ResponseEntity.badRequest().body("Bạn đã ứng tuyển công việc này rồi");
        }

        // Only allow attaching a CV the caller owns
        if (req.getCvId() != null
                && userCvRepository.findByIdAndUserIdAndIsDeletedFalse(req.getCvId(), user.getId()).isEmpty()) {
            return ResponseEntity.badRequest().body("CV không hợp lệ");
        }

        Job job = jobRepository.findById(req.getJobId()).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();

        Application app = new Application();
        app.setUser(user);
        app.setJob(job);
        app.setCvId(req.getCvId());
        app.setStatus("PENDING");
        applicationRepository.save(app);

        return ResponseEntity.ok(ApplicationResponse.from(app));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteApplication(@PathVariable Long id) {
        User user = currentUserService.currentUser().orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        Application app = applicationRepository.findById(id).orElse(null);
        if (app != null && app.getUser().getId().equals(user.getId())) {
            applicationRepository.delete(app);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
