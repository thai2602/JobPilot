package com.jobportal.modules.cv;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.jobportal.modules.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "user_cvs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCv {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id")
    private CvTemplate template;

    @Column(name = "cv_name", nullable = false)
    private String cvName;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "job_title")
    private String jobTitle;

    @Column(columnDefinition = "TEXT")
    private String summary;

    @Column(length = 20)
    private String phone;

    private String email;

    private String location;

    @Column(name = "avatar_url", columnDefinition = "TEXT")
    private String avatarUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "cv_data", columnDefinition = "jsonb")
    private Map<String, Object> cvData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> settings;

    @Column(name = "file_url", columnDefinition = "TEXT")
    private String fileUrl;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @Column(name = "is_deleted")
    private Boolean isDeleted = false;

    // Relationships mapped for cascade operations
    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvSkill> skills = new ArrayList<>();

    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvExperience> experiences = new ArrayList<>();

    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvProject> projects = new ArrayList<>();

    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvEducation> educations = new ArrayList<>();

    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvAttachment> attachments = new ArrayList<>();

    @OneToMany(mappedBy = "cv", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserCvSocial> socials = new ArrayList<>();

    // Helper methods for bi-directional relationships
    public void addSkill(UserCvSkill skill) {
        skills.add(skill);
        skill.setCv(this);
    }
    public void addExperience(UserCvExperience exp) {
        experiences.add(exp);
        exp.setCv(this);
    }
    public void addProject(UserCvProject proj) {
        projects.add(proj);
        proj.setCv(this);
    }
    public void addEducation(UserCvEducation edu) {
        educations.add(edu);
        edu.setCv(this);
    }
    public void addAttachment(UserCvAttachment att) {
        attachments.add(att);
        att.setCv(this);
    }
    public void addSocial(UserCvSocial soc) {
        socials.add(soc);
        soc.setCv(this);
    }
}
