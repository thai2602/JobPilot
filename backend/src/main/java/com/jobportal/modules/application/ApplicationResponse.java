package com.jobportal.modules.application;

import com.jobportal.modules.job.JobResponse;

import java.time.LocalDateTime;

/** API view of an Application; deliberately excludes the owning User entity. */
public record ApplicationResponse(
        Long id,
        JobResponse job,
        Long cvId,
        String status,
        String trackingNote,
        LocalDateTime appliedAt) {

    public static ApplicationResponse from(Application application) {
        return new ApplicationResponse(
                application.getId(),
                application.getJob() == null ? null : JobResponse.from(application.getJob()),
                application.getCvId(),
                application.getStatus(),
                application.getTrackingNote(),
                application.getAppliedAt());
    }
}
