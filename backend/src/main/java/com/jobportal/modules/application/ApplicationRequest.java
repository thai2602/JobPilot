package com.jobportal.modules.application;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class ApplicationRequest {
    @NotNull(message = "jobId là bắt buộc")
    @Positive(message = "jobId không hợp lệ")
    private Long jobId;

    /** Optional; must be a CV owned by the caller. */
    @Positive(message = "cvId không hợp lệ")
    private Long cvId;
}
