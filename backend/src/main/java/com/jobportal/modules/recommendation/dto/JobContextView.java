package com.jobportal.modules.recommendation.dto;

import java.math.BigDecimal;

public record JobContextView(
        Long jobId,
        String slug,
        String title,
        String companyName,
        String companySlug,
        String companyDescription,
        String companyCulture,
        String jobType,
        String jobLevel,
        String experienceYears,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String currency,
        String locationCity,
        String description,
        String requirements,
        String benefits) {
}
