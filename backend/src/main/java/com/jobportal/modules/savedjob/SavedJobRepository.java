package com.jobportal.modules.savedjob;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SavedJobRepository extends JpaRepository<SavedJob, Long> {
    List<SavedJob> findByUserIdOrderBySavedAtDesc(Long userId);
    boolean existsByUserIdAndJobId(Long userId, Long jobId);
}
