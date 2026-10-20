package com.jobportal.modules.savedjob;

import com.jobportal.modules.job.JobResponse;

import java.time.LocalDateTime;

/** API view of a SavedJob; deliberately excludes the owning User entity. */
public record SavedJobResponse(
        Long id,
        JobResponse job,
        LocalDateTime savedAt) {

    public static SavedJobResponse from(SavedJob savedJob) {
        return new SavedJobResponse(
                savedJob.getId(),
                savedJob.getJob() == null ? null : JobResponse.from(savedJob.getJob()),
                savedJob.getSavedAt());
    }
}
