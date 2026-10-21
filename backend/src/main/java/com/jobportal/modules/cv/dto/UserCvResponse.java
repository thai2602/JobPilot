package com.jobportal.modules.cv.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * API view of a UserCv. Never exposes the owning User or soft-delete flag.
 * Shape matches ApiUserCv in frontend/src/services/cvApi.ts.
 */
public record UserCvResponse(
        Long id,
        String cvName,
        String fullName,
        String jobTitle,
        String summary,
        String phone,
        String email,
        String location,
        String avatarUrl,
        Map<String, Object> cvData,
        Map<String, Object> settings,
        String fileUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<Skill> skills,
        List<Experience> experiences,
        List<Education> educations,
        List<Project> projects,
        List<Attachment> attachments,
        List<Social> socials) {

    public record Skill(Long id, Long skillId, String skillName, String level) {
    }

    public record Experience(Long id, String company, String position, String startDate, String endDate,
                             String description, String[] technologies) {
    }

    public record Education(Long id, String school, String major, String startDate, String endDate) {
    }

    public record Project(Long id, String name, String description, String[] technologies, String link) {
    }

    public record Attachment(Long id, String type, String name, String organization, String yearOrLevel,
                             String description) {
    }

    public record Social(Long id, String platform, String url) {
    }
}
