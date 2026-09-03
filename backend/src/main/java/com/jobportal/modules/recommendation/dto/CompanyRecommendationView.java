package com.jobportal.modules.recommendation.dto;

public record CompanyRecommendationView(
        Long id,
        String name,
        String slug,
        String logoUrl,
        String size,
        String description,
        String culture,
        String benefits) {
}
