package com.jobportal.modules.job;

import com.jobportal.common.OffsetBasedPageRequest;
import com.jobportal.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Read side of the public job board: only published, unexpired jobs of active companies. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobService {

    static final int MAX_PAGE_SIZE = 100;

    private final JobRepository jobRepository;

    public List<JobResponse> searchOpenJobs(int offset, int limit, String search, String location,
                                            String jobType, String jobLevel) {
        return jobRepository.searchOpenJobs(search, location, jobType, jobLevel, LocalDateTime.now(),
                        new OffsetBasedPageRequest(Math.max(0, offset), clampLimit(limit)))
                .stream()
                .map(JobResponse::from)
                .toList();
    }

    public JobResponse getOpenJob(Long id) {
        return jobRepository.findOpenById(id, LocalDateTime.now())
                .map(JobResponse::from)
                .orElseThrow(JobService::jobNotFound);
    }

    public JobResponse getOpenJobBySlug(String slug) {
        return jobRepository.findOpenBySlug(slug, LocalDateTime.now())
                .map(JobResponse::from)
                .orElseThrow(JobService::jobNotFound);
    }

    /** Job entity for attaching to applications / saved jobs; 404 when it does not exist. */
    public Job requireJob(Long id) {
        return jobRepository.findById(id).orElseThrow(JobService::jobNotFound);
    }

    public static int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
    }

    private static NotFoundException jobNotFound() {
        return new NotFoundException("Không tìm thấy công việc");
    }
}
