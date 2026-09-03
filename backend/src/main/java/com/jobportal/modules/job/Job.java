package com.jobportal.modules.job;

import com.jobportal.modules.company.Company;
import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "jobs")
@Data
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "company_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties("positions")
    private Company company;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, unique = true)
    private String slug;

    @Column(name = "industry_id")
    private Long industryId;

    @Column(columnDefinition = "TEXT")
    private String industry;

    @Column(name = "job_type")
    private String jobType;

    @Column(name = "job_level")
    private String jobLevel;

    @Column(name = "experience_years")
    private String experienceYears;

    @Column(name = "salary_min")
    private BigDecimal salaryMin;

    @Column(name = "salary_max")
    private BigDecimal salaryMax;

    private String currency = "VND";

    @Column(name = "location_city")
    private String locationCity;

    @Column(name = "location_address", columnDefinition = "TEXT")
    private String locationAddress;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String requirements;

    @Column(columnDefinition = "TEXT")
    private String benefits;

    private String status = "PUBLISHED";

    @Column(name = "expired_at")
    private LocalDateTime expiredAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;
}
