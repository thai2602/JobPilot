package com.jobportal.modules.recommendation.dto;

import java.time.LocalDateTime;
import java.util.List;

public record JobRecommendationResult(
        Long cvId,
        int evaluatedJobs,
        LocalDateTime generatedAt,
        List<JobRecommendationView> recommendations) {
}
