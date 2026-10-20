package com.jobportal.modules.savedjob;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import com.jobportal.modules.user.User;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.security.CurrentUserService;
import java.util.List;

@RestController
@RequestMapping("/api/saved-jobs")
@CrossOrigin(origins = "*")
public class SavedJobController {

    private final SavedJobRepository savedJobRepository;
    private final JobRepository jobRepository;
    private final CurrentUserService currentUserService;

    public SavedJobController(SavedJobRepository savedJobRepository, JobRepository jobRepository,
                              CurrentUserService currentUserService) {
        this.savedJobRepository = savedJobRepository;
        this.jobRepository = jobRepository;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<SavedJobResponse>> getMySavedJobs() {
        User user = currentUserService.currentUser().orElse(null);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(savedJobRepository.findByUserIdOrderBySavedAtDesc(user.getId()).stream()
                .map(SavedJobResponse::from)
                .toList());
    }

    @PostMapping
    public ResponseEntity<?> saveJob(@RequestBody SavedJobRequest req) {
        User user = currentUserService.currentUser().orElse(null);
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

        return ResponseEntity.ok(SavedJobResponse.from(savedJob));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteSavedJob(@PathVariable Long id) {
        User user = currentUserService.currentUser().orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        SavedJob savedJob = savedJobRepository.findById(id).orElse(null);
        if (savedJob != null && savedJob.getUser().getId().equals(user.getId())) {
            savedJobRepository.delete(savedJob);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
