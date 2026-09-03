package com.jobportal.modules.job;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {
    @Query("SELECT j FROM Job j JOIN FETCH j.company c WHERE " +
           "(j.isDeleted = false OR j.isDeleted IS NULL) AND " +
           "j.status = 'PUBLISHED' AND " +
           "(j.expiredAt IS NULL OR j.expiredAt > :now) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL) " +
           "ORDER BY j.updatedAt DESC, j.createdAt DESC")
    List<Job> findOpenJobsForRecommendation(
            @Param("now") LocalDateTime now,
            Pageable pageable);

    @Query("SELECT j FROM Job j JOIN FETCH j.company c WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(j.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(j.description) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(j.company.name) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:location IS NULL OR :location = '' OR LOWER(j.locationCity) LIKE LOWER(CONCAT('%', :location, '%')) OR LOWER(j.locationAddress) LIKE LOWER(CONCAT('%', :location, '%'))) AND " +
           "(:jobType IS NULL OR :jobType = '' OR j.jobType = :jobType) AND " +
           "(:jobLevel IS NULL OR :jobLevel = '' OR j.jobLevel = :jobLevel) AND " +
           "(j.isDeleted = false OR j.isDeleted IS NULL) AND " +
           "j.status = 'PUBLISHED' AND " +
           "(j.expiredAt IS NULL OR j.expiredAt > :now) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL) " +
           "ORDER BY j.updatedAt DESC, j.createdAt DESC, j.id DESC")
    List<Job> searchOpenJobs(
            @Param("search") String search,
            @Param("location") String location,
            @Param("jobType") String jobType,
            @Param("jobLevel") String jobLevel,
            @Param("now") LocalDateTime now,
            Pageable pageable);

    @Query("SELECT j FROM Job j JOIN FETCH j.company c WHERE " +
           "j.id = :id AND (j.isDeleted = false OR j.isDeleted IS NULL) AND " +
           "j.status = 'PUBLISHED' AND (j.expiredAt IS NULL OR j.expiredAt > :now) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL)")
    Optional<Job> findOpenById(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Query("SELECT j FROM Job j JOIN FETCH j.company c WHERE " +
           "j.slug = :slug AND (j.isDeleted = false OR j.isDeleted IS NULL) AND " +
           "j.status = 'PUBLISHED' AND (j.expiredAt IS NULL OR j.expiredAt > :now) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL)")
    Optional<Job> findOpenBySlug(@Param("slug") String slug, @Param("now") LocalDateTime now);

    @Query("SELECT j FROM Job j JOIN FETCH j.company c WHERE " +
           "c.id IN :companyIds AND (j.isDeleted = false OR j.isDeleted IS NULL) AND " +
           "j.status = 'PUBLISHED' AND (j.expiredAt IS NULL OR j.expiredAt > :now) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL) " +
           "ORDER BY j.updatedAt DESC, j.createdAt DESC, j.id DESC")
    List<Job> findOpenByCompanyIds(
            @Param("companyIds") List<Long> companyIds,
            @Param("now") LocalDateTime now);
}
