package com.jobportal.modules.savedjob;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class SavedJobRequest {
    @NotNull(message = "jobId là bắt buộc")
    @Positive(message = "jobId không hợp lệ")
    private Long jobId;
}
