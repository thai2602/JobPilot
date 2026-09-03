package com.jobportal.modules.savedjob;

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
@RequestMapping("/api/saved-jobs")
@CrossOrigin(origins = "*")
public class SavedJobController {

    private final SavedJobRepository savedJobRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;

    public SavedJobController(SavedJobRepository savedJobRepository, UserRepository userRepository, JobRepository jobRepository) {
        this.savedJobRepository = savedJobRepository;
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
    public ResponseEntity<List<SavedJob>> getMySavedJobs() {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(savedJobRepository.findByUserIdOrderBySavedAtDesc(user.getId()));
    }

    @PostMapping
    public ResponseEntity<?> saveJob(@RequestBody SavedJobRequest req) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).body("Chưa đăng nhập");
        
        if (savedJobRepository.existsByUserIdAndJobId(user.getId(), req.getJobId())) {
            return ResponseEntity.badRequest().body("Bạn đã lưu công việc này rồi");
        }

        Job job = jobRepository.findById(req.getJobId()).orElse(null);
        if (job == null) return ResponseEntity.notFound().build();

        SavedJob savedJob = new SavedJob();
        savedJob.setUser(user);
        savedJob.setJob(job);
        savedJobRepository.save(savedJob);

        return ResponseEntity.ok(savedJob);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSavedJob(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        SavedJob savedJob = savedJobRepository.findById(id).orElse(null);
        if (savedJob != null && savedJob.getUser().getId().equals(user.getId())) {
            savedJobRepository.delete(savedJob);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
