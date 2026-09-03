package com.jobportal.modules.application;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByUserIdOrderByAppliedAtDesc(Long userId);
    boolean existsByUserIdAndJobId(Long userId, Long jobId);

    @Query("SELECT a.job.id FROM Application a WHERE a.user.id = :userId")
    List<Long> findAppliedJobIdsByUserId(@Param("userId") Long userId);
}
