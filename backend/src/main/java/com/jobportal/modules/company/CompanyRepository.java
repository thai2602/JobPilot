package com.jobportal.modules.company;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.repository.query.Param;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {

    @Query("SELECT c FROM Company c WHERE (c.isDeleted = false OR c.isDeleted IS NULL)")
    List<Company> findActiveCompanies(Pageable pageable);

    @Query("SELECT c FROM Company c WHERE " +
           "(c.isDeleted = false OR c.isDeleted IS NULL) AND " +
           "TRIM(COALESCE(c.description, '')) <> '' AND " +
           "TRIM(COALESCE(c.industry, '')) <> '' AND " +
           "TRIM(COALESCE(c.headquarters, '')) <> '' AND " +
           "TRIM(COALESCE(c.size, '')) <> ''")
    List<Company> findCompleteActiveCompanies(Pageable pageable);

    @Query("SELECT c FROM Company c WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL)")
    List<Company> searchActiveCompanies(@Param("search") String search, Pageable pageable);

    @Query("SELECT c FROM Company c WHERE " +
           "(:search IS NULL OR :search = '' OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.description) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(c.isDeleted = false OR c.isDeleted IS NULL) AND " +
           "TRIM(COALESCE(c.description, '')) <> '' AND " +
           "TRIM(COALESCE(c.industry, '')) <> '' AND " +
           "TRIM(COALESCE(c.headquarters, '')) <> '' AND " +
           "TRIM(COALESCE(c.size, '')) <> ''")
    List<Company> searchCompleteActiveCompanies(@Param("search") String search, Pageable pageable);

    @Query("SELECT c FROM Company c WHERE c.slug = :slug AND (c.isDeleted = false OR c.isDeleted IS NULL)")
    Optional<Company> findActiveBySlug(@Param("slug") String slug);
}
