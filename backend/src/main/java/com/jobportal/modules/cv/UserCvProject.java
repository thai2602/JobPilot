package com.jobportal.modules.cv;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_cv_projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCvProject {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    private UserCv cv;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "technologies", columnDefinition = "text[]")
    private String[] technologies;

    @Column(columnDefinition = "TEXT")
    private String link;
}

