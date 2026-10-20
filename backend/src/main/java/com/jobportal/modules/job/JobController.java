package com.jobportal.modules.job;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class JobController {

    private final JobService jobService;

    @GetMapping
    public List<JobResponse> getAllJobs(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String jobType,
            @RequestParam(required = false) String jobLevel) {
        return jobService.searchOpenJobs(offset, limit, search, location, jobType, jobLevel);
    }

    @GetMapping("/{id}")
    public JobResponse getJobById(@PathVariable Long id) {
        return jobService.getOpenJob(id);
    }

    @GetMapping("/slug/{slug}")
    public JobResponse getJobBySlug(@PathVariable String slug) {
        return jobService.getOpenJobBySlug(slug);
    }
}
