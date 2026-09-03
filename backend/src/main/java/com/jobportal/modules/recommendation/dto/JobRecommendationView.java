package com.jobportal.modules.recommendation.dto;

import java.math.BigDecimal;
import java.util.List;

public record JobRecommendationView(
        Long jobId,
        String slug,
        String title,
        String jobType,
        String jobLevel,
        String experienceYears,
        BigDecimal salaryMin,
        BigDecimal salaryMax,
        String currency,
        String locationCity,
        String locationAddress,
        String description,
        String requirements,
        String benefits,
        CompanyRecommendationView company,
        int matchScore,
        List<String> matchedSkills,
        List<String> reasons) {
}
