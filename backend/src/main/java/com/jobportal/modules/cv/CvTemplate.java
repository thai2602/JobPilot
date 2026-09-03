package com.jobportal.modules.cv;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.util.Map;

@Entity
@Table(name = "cv_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CvTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "html_structure", columnDefinition = "TEXT")
    private String htmlStructure;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "default_settings", columnDefinition = "jsonb")
    private Map<String, Object> defaultSettings;
}
