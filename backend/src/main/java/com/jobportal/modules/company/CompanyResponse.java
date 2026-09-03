package com.jobportal.modules.company;

import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobResponse;

import java.time.LocalDateTime;
import java.util.List;

public record CompanyResponse(
        Long id,
        String name,
        String slug,
        String logoUrl,
        String color,
        String website,
        Long industryId,
        String industry,
        String headquarters,
        String size,
        String description,
        String culture,
        String benefits,
        Boolean isFeatured,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<JobResponse> positions) {

    public static CompanyResponse from(Company company, List<Job> openPositions) {
        List<JobResponse> positions = openPositions == null
                ? List.of()
                : openPositions.stream().map(JobResponse::from).toList();
        return new CompanyResponse(
                company.getId(),
                company.getName(),
                company.getSlug(),
                company.getLogoUrl(),
                company.getColor(),
                company.getWebsite(),
                company.getIndustryId(),
                company.getIndustry(),
                company.getHeadquarters(),
                company.getSize(),
                company.getDescription(),
                company.getCulture(),
                company.getBenefits(),
                company.getIsFeatured(),
                company.getCreatedAt(),
                company.getUpdatedAt(),
                positions);
    }
}
