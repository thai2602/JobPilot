package com.jobportal.modules.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CvTemplateRepository extends JpaRepository<CvTemplate, Long> {
}
