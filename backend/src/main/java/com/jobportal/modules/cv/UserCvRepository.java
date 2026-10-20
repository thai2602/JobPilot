package com.jobportal.modules.cv;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCvRepository extends JpaRepository<UserCv, Long> {
    List<UserCv> findByUserIdAndIsDeletedFalse(Long userId);

    /** Owner-scoped lookup: empty when the CV does not exist, is deleted, or belongs to another user. */
    Optional<UserCv> findByIdAndUserIdAndIsDeletedFalse(Long id, Long userId);
}
