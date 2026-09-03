package com.jobportal.modules.cv;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_cv_skills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserCvSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id", nullable = false)
    @JsonIgnore
    private UserCv cv;

    /** FK sang lookup table (tuỳ chọn — null nếu là free-text skill) */
    @Column(name = "skill_id")
    private Long skillId;

    /** Tên kỹ năng do người dùng tự nhập */
    @Column(name = "skill_name", length = 150)
    private String skillName;

    @Column(length = 50)
    private String level;
}
