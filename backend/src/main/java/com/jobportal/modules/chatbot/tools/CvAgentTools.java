package com.jobportal.modules.chatbot.tools;

import com.jobportal.modules.chatbot.service.CvContextHolder;
import com.jobportal.modules.cv.CvService;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvExperience;
import com.jobportal.modules.cv.UserCvProject;
import com.jobportal.modules.cv.UserCvEducation;
import com.jobportal.modules.cv.UserCvAttachment;
import com.jobportal.modules.cv.UserCvRepository;
import dev.langchain4j.agent.tool.Tool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class CvAgentTools {

    private final CvService cvService;
    private final UserCvRepository userCvRepository;

    // ──────────────────────────────────────────────────────────────────────────
    // Context-aware tool: AI tự nhận biết CV đang mở
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * AI gọi tool này đầu tiên để lấy nội dung CV đang được chỉnh sửa.
     * cvId được inject tự động từ CvContextHolder — user không cần nhập.
     */
    @Transactional(readOnly = true)
    @Tool("Get the full content of the CV that the user is currently editing. " +
          "Call this tool first before giving any CV advice or feedback. " +
          "No parameters needed — the CV is automatically detected from context.")
    public String getCurrentCvContext() {
        Long cvId = CvContextHolder.get();
        if (cvId == null) {
            return "[No CV is currently open. Please ask the user to open a CV in the editor first.]";
        }
        log.info("Tool called: getCurrentCvContext — auto-detected cvId: {}", cvId);
        return buildCvSnapshot(cvId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Explicit tools (dùng khi user chỉ định cvId hoặc userId)
    // ──────────────────────────────────────────────────────────────────────────

    @Tool("Get all CVs of a specific user by their user ID. Returns basic info including CV IDs.")
    public String getUserCvs(Long userId) {
        log.info("Tool called: getUserCvs for userId: {}", userId);
        List<UserCv> cvs = cvService.getUserCvs(userId);
        if (cvs == null || cvs.isEmpty()) {
            return "No CVs found for user ID: " + userId;
        }
        StringBuilder sb = new StringBuilder();
        for (UserCv cv : cvs) {
            sb.append("CV ID: ").append(cv.getId())
              .append(", Name: ").append(cv.getCvName())
              .append(", Job Title: ").append(cv.getJobTitle())
              .append("\n");
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    @Tool("Get detailed information of a specific CV by its CV ID.")
    public String getCvDetails(Long cvId) {
        log.info("Tool called: getCvDetails for cvId: {}", cvId);
        return buildCvSnapshot(cvId);
    }

    @Transactional
    @Tool("Update the job title and/or summary of the currently open CV (or a specified CV). " +
          "Pass cvId=null to use the currently open CV.")
    public String updateCvBasicInfo(Long cvId, String newJobTitle, String newSummary) {
        Long targetId = (cvId != null) ? cvId : CvContextHolder.get();
        if (targetId == null) {
            return "Error: No CV is open and no cvId was provided.";
        }
        log.info("Tool called: updateCvBasicInfo for cvId: {}", targetId);
        try {
            UserCv cv = userCvRepository.findById(targetId)
                    .orElseThrow(() -> new RuntimeException("CV not found"));
            if (newJobTitle != null && !newJobTitle.trim().isEmpty()) cv.setJobTitle(newJobTitle);
            if (newSummary  != null && !newSummary.trim().isEmpty())  cv.setSummary(newSummary);
            userCvRepository.save(cv);
            return "CV ID " + targetId + " updated — Job Title: " + cv.getJobTitle()
                    + ", Summary: " + cv.getSummary();
        } catch (Exception e) {
            return "Failed to update CV: " + e.getMessage();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Private helper
    // ──────────────────────────────────────────────────────────────────────────

    private String buildCvSnapshot(Long cvId) {
        return userCvRepository.findById(cvId).map(cv -> {
            StringBuilder sb = new StringBuilder();
            sb.append("=== CV SNAPSHOT (ID: ").append(cvId).append(") ===\n");
            sb.append("Full Name    : ").append(cv.getFullName()).append("\n");
            sb.append("Job Title    : ").append(cv.getJobTitle()).append("\n");
            sb.append("Email        : ").append(cv.getEmail()).append("\n");
            sb.append("Phone        : ").append(cv.getPhone()).append("\n");
            sb.append("Location     : ").append(cv.getLocation()).append("\n");
            sb.append("Summary      : ").append(cv.getSummary()).append("\n");

            // Skills
            if (cv.getSkills() != null && !cv.getSkills().isEmpty()) {
                String skills = cv.getSkills().stream()
                        .map(s -> {
                            String name  = s.getSkillName() != null && !s.getSkillName().isBlank() ? s.getSkillName() : (s.getSkillId() != null ? "Skill#" + s.getSkillId() : "?");
                            String level = s.getLevel()   != null ? " (" + s.getLevel() + ")" : "";
                            return name + level;
                        })
                        .collect(Collectors.joining(", "));
                sb.append("Skills       : ").append(skills).append("\n");
            }

            // Experiences
            if (cv.getExperiences() != null && !cv.getExperiences().isEmpty()) {
                sb.append("Experiences  :\n");
                for (UserCvExperience exp : cv.getExperiences()) {
                    sb.append("  - ").append(exp.getPosition())
                      .append(" @ ").append(exp.getCompany())
                      .append(" (").append(exp.getStartDate()).append(" → ").append(exp.getEndDate()).append(")")
                      .append("\n");
                    if (exp.getDescription() != null && !exp.getDescription().isBlank()) {
                        sb.append("    ").append(exp.getDescription()).append("\n");
                    }
                }
            }

            // Projects
            if (cv.getProjects() != null && !cv.getProjects().isEmpty()) {
                sb.append("Projects     :\n");
                for (UserCvProject proj : cv.getProjects()) {
                    String linkStr = (proj.getLink() != null && !proj.getLink().isBlank()) ? " (Link: " + proj.getLink() + ")" : "";
                    sb.append("  - ").append(proj.getName()).append(linkStr).append("\n");
                    if (proj.getDescription() != null && !proj.getDescription().isBlank()) {
                        sb.append("    Description: ").append(proj.getDescription()).append("\n");
                    }
                    if (proj.getTechnologies() != null && proj.getTechnologies().length > 0) {
                        sb.append("    Technologies: ").append(String.join(", ", proj.getTechnologies())).append("\n");
                    }
                }
            }

            // Education
            if (cv.getEducations() != null && !cv.getEducations().isEmpty()) {
                sb.append("Education    :\n");
                for (UserCvEducation edu : cv.getEducations()) {
                    sb.append("  - ").append(edu.getSchool())
                      .append(" | ").append(edu.getMajor())
                      .append(" (").append(edu.getStartDate()).append(" → ").append(edu.getEndDate()).append(")\n");
                }
            }

            // Certifications & Awards
            if (cv.getAttachments() != null && !cv.getAttachments().isEmpty()) {
                sb.append("Certifications & Awards:\n");
                for (UserCvAttachment att : cv.getAttachments()) {
                    String org = att.getOrganization() != null ? " by " + att.getOrganization() : "";
                    String level = att.getYearOrLevel() != null ? " (" + att.getYearOrLevel() + ")" : "";
                    sb.append("  - [").append(att.getType()).append("] ").append(att.getName())
                      .append(org).append(level).append("\n");
                    if (att.getDescription() != null && !att.getDescription().isBlank()) {
                        sb.append("    ").append(att.getDescription()).append("\n");
                    }
                }
            }

            return sb.toString();
        }).orElse("CV not found for ID: " + cvId);
    }
}
