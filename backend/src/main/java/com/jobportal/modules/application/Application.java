package com.jobportal.modules.application;

import com.jobportal.modules.user.User;
import com.jobportal.modules.job.Job;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications")
@Data
public class Application {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @Column(name = "cv_id")
    private Long cvId;

    private String status = "PENDING"; // PENDING, REVIEWING, REJECTED, ACCEPTED
    
    @Column(name = "tracking_note", columnDefinition = "TEXT")
    private String trackingNote;

    @Column(name = "applied_at", updatable = false)
    private LocalDateTime appliedAt;

    @PrePersist
    protected void onCreate() {
        appliedAt = LocalDateTime.now();
        if (trackingNote == null) {
            trackingNote = "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.";
        }
    }
}
