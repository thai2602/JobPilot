package com.jobportal.modules.cv.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;
import java.util.Map;

/**
 * Create/update payload for a CV. Size limits mirror the column lengths of the CV entities so that
 * oversized input is a 400 instead of a database error. Also used as the result of CV extraction.
 */
@Data
public class UserCvRequestDTO {
    private static final int MAX_ITEMS = 100;

    private Long templateId;

    @NotBlank(message = "Tên CV là bắt buộc")
    @Size(max = 255, message = "Tên CV tối đa 255 ký tự")
    private String cvName;

    @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
    private String fullName;

    @Size(max = 255, message = "Chức danh tối đa 255 ký tự")
    private String jobTitle;

    private String summary;

    @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự")
    private String phone;

    @Size(max = 255, message = "Email tối đa 255 ký tự")
    private String email;

    @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự")
    private String location;

    private String avatarUrl;
    private Map<String, Object> cvData;
    private Map<String, Object> settings;
    private String fileUrl;

    @Size(max = MAX_ITEMS, message = "Quá nhiều kỹ năng")
    private List<@Valid SkillDTO> skills;

    @Size(max = MAX_ITEMS, message = "Quá nhiều kinh nghiệm")
    private List<@Valid ExperienceDTO> experiences;

    @Size(max = MAX_ITEMS, message = "Quá nhiều dự án")
    private List<@Valid ProjectDTO> projects;

    @Size(max = MAX_ITEMS, message = "Quá nhiều mục học vấn")
    private List<@Valid EducationDTO> educations;

    @Size(max = MAX_ITEMS, message = "Quá nhiều mục đính kèm")
    private List<@Valid AttachmentDTO> attachments;

    @Size(max = MAX_ITEMS, message = "Quá nhiều liên kết mạng xã hội")
    private List<@Valid SocialDTO> socials;

    @Data
    public static class SkillDTO {
        private Long skillId;

        @Size(max = 150, message = "Tên kỹ năng tối đa 150 ký tự")
        private String skillName;

        @Size(max = 50, message = "Cấp độ kỹ năng tối đa 50 ký tự")
        private String level;
    }

    @Data
    public static class ExperienceDTO {
        @Size(max = 255, message = "Tên công ty tối đa 255 ký tự")
        private String company;

        @Size(max = 255, message = "Vị trí tối đa 255 ký tự")
        private String position;

        @Size(max = 20, message = "Ngày bắt đầu tối đa 20 ký tự")
        private String startDate;

        @Size(max = 20, message = "Ngày kết thúc tối đa 20 ký tự")
        private String endDate;

        private String description;
        private String[] technologies;
    }

    @Data
    public static class ProjectDTO {
        @Size(max = 255, message = "Tên dự án tối đa 255 ký tự")
        private String name;

        private String description;
        private String[] technologies;
        private String link;
    }

    @Data
    public static class EducationDTO {
        @Size(max = 255, message = "Tên trường tối đa 255 ký tự")
        private String school;

        @Size(max = 255, message = "Chuyên ngành tối đa 255 ký tự")
        private String major;

        @Size(max = 20, message = "Ngày bắt đầu tối đa 20 ký tự")
        private String startDate;

        @Size(max = 20, message = "Ngày kết thúc tối đa 20 ký tự")
        private String endDate;
    }

    @Data
    public static class AttachmentDTO {
        @Size(max = 50, message = "Loại mục đính kèm tối đa 50 ký tự")
        private String type;

        @Size(max = 255, message = "Tên mục đính kèm tối đa 255 ký tự")
        private String name;

        @Size(max = 255, message = "Tổ chức tối đa 255 ký tự")
        private String organization;

        @Size(max = 50, message = "Năm/cấp độ tối đa 50 ký tự")
        private String yearOrLevel;

        private String description;
    }

    @Data
    public static class SocialDTO {
        @Size(max = 50, message = "Nền tảng tối đa 50 ký tự")
        private String platform;

        private String url;
    }
}
