package com.jobportal.modules.cv;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_cv_attachments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCvAttachment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private UserCv cv;

    @Column(length = 50)
    private String type;

    private String name;

    private String organization;

    @Column(name = "year_or_level", length = 50)
    private String yearOrLevel;

    @Column(columnDefinition = "TEXT")
    private String description;
}

