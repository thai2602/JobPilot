package com.jobportal.modules.cv.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class UserCvRequestDTO {
    private Long userId;
    private Long templateId;
    private String cvName;
    private String fullName;
    private String jobTitle;
    private String summary;
    private String phone;
    private String email;
    private String location;
    private String avatarUrl;
    private Map<String, Object> cvData;
    private Map<String, Object> settings;
    private String fileUrl;

    private List<SkillDTO> skills;
    private List<ExperienceDTO> experiences;
    private List<ProjectDTO> projects;
    private List<EducationDTO> educations;
    private List<AttachmentDTO> attachments;
    private List<SocialDTO> socials;

    @Data
    public static class SkillDTO {
        private Long skillId;
        private String skillName;
        private String level;
    }

    @Data
    public static class ExperienceDTO {
        private String company;
        private String position;
        private String startDate;
        private String endDate;
        private String description;
        private String[] technologies;
    }

    @Data
    public static class ProjectDTO {
        private String name;
        private String description;
        private String[] technologies;
        private String link;
    }

    @Data
    public static class EducationDTO {
        private String school;
        private String major;
        private String startDate;
        private String endDate;
    }

    @Data
    public static class AttachmentDTO {
        private String type;
        private String name;
        private String organization;
        private String yearOrLevel;
        private String description;
    }

    @Data
    public static class SocialDTO {
        private String platform;
        private String url;
    }
}
