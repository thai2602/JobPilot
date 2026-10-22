package com.jobportal.modules.job;

import com.jobportal.common.OffsetBasedPageRequest;
import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Read side of the public job board: published and expired jobs of active companies (never DRAFT). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobService {

    static final int MAX_PAGE_SIZE = 100;

    private final JobRepository jobRepository;

    public List<JobResponse> searchJobs(int offset, int limit, String search, String location,
                                        String jobType, String jobLevel, boolean includeExpired) {
        return jobRepository.searchJobs(search, location, jobType, jobLevel, includeExpired, LocalDateTime.now(),
                        new OffsetBasedPageRequest(Math.max(0, offset), clampLimit(limit)))
                .stream()
                .map(JobResponse::from)
                .toList();
    }

    public JobResponse getJob(Long id) {
        return jobRepository.findVisibleById(id)
                .map(JobResponse::from)
                .orElseThrow(JobService::jobNotFound);
    }

    public JobResponse getJobBySlug(String slug) {
        return jobRepository.findVisibleBySlug(slug)
                .map(JobResponse::from)
                .orElseThrow(JobService::jobNotFound);
    }

    /** Job entity for attaching to saved jobs; 404 when it does not exist. */
    public Job requireJob(Long id) {
        return jobRepository.findById(id).orElseThrow(JobService::jobNotFound);
    }

    /** Job entity for a new application; 400 when the job is closed or past its deadline. */
    public Job requireOpenJob(Long id) {
        Job job = requireJob(id);
        if (!isOpen(job, LocalDateTime.now())) {
            throw new BadRequestException("Tin tuyển dụng đã hết hạn ứng tuyển");
        }
        return job;
    }

    public static boolean isOpen(Job job, LocalDateTime now) {
        return "PUBLISHED".equals(job.getStatus())
                && (job.getExpiredAt() == null || job.getExpiredAt().isAfter(now));
    }

    public static int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
    }

    private static NotFoundException jobNotFound() {
        return new NotFoundException("Không tìm thấy công việc");
    }
}
