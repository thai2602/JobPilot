package com.jobportal.modules.job;

import com.jobportal.modules.company.Company;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record JobResponse(
        Long id,
        CompanySummary company,
        String title,
        String slug,
        Long industryId,
        String industry,
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
        String status,
        LocalDateTime expiredAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt) {

    public static JobResponse from(Job job) {
        return new JobResponse(
                job.getId(),
                CompanySummary.from(job.getCompany()),
                job.getTitle(),
                job.getSlug(),
                job.getIndustryId(),
                job.getIndustry(),
                job.getJobType(),
                job.getJobLevel(),
                job.getExperienceYears(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getCurrency(),
                job.getLocationCity(),
                job.getLocationAddress(),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                job.getStatus(),
                job.getExpiredAt(),
                job.getCreatedAt(),
                job.getUpdatedAt());
    }

    public record CompanySummary(
            Long id,
            String name,
            String slug,
            String logoUrl,
            String color,
            String description,
            String size) {

        private static CompanySummary from(Company company) {
            if (company == null) {
                return null;
            }
            return new CompanySummary(
                    company.getId(),
                    company.getName(),
                    company.getSlug(),
                    company.getLogoUrl(),
                    company.getColor(),
                    company.getDescription(),
                    company.getSize());
        }
    }
}
