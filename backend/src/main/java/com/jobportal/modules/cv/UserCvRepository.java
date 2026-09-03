package com.jobportal.modules.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserCvRepository extends JpaRepository<UserCv, Long> {
    List<UserCv> findByUserIdAndIsDeletedFalse(Long userId);
}
