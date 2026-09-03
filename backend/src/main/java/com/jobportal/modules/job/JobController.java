package com.jobportal.modules.job;

import com.jobportal.common.OffsetBasedPageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@CrossOrigin(origins = "*")
public class JobController {

    private final JobRepository jobRepository;

    public JobController(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    @GetMapping
    public List<JobResponse> getAllJobs(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String jobLevel) {
        Pageable pageable = new OffsetBasedPageRequest(Math.max(0, offset), clampLimit(limit));
        return jobRepository.searchOpenJobs(search, location, jobType, jobLevel, LocalDateTime.now(), pageable)
                .stream()
                .map(JobResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobResponse> getJobById(@PathVariable Long id) {
        return jobRepository.findOpenById(id, LocalDateTime.now())
                .map(JobResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<JobResponse> getJobBySlug(@PathVariable String slug) {
        return jobRepository.findOpenBySlug(slug, LocalDateTime.now())
                .map(JobResponse::from)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), 100);
    }
}
