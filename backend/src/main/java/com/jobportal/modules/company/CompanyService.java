package com.jobportal.modules.company;

import com.jobportal.common.OffsetBasedPageRequest;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.modules.job.JobService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;
    private final EntityManager entityManager;

    /**
     * Active companies with their open positions.
     *
     * @param completeOnly only companies whose profile (description, industry, HQ, size) is filled in
     */
    public List<CompanyResponse> listCompanies(int offset, int limit, String search, boolean completeOnly) {
        Pageable pageable = new OffsetBasedPageRequest(Math.max(0, offset), JobService.clampLimit(limit));
        List<Company> companies;
        if (search != null && !search.trim().isEmpty()) {
            companies = completeOnly
                    ? companyRepository.searchCompleteActiveCompanies(search, pageable)
                    : companyRepository.searchActiveCompanies(search, pageable);
        } else {
            companies = completeOnly
                    ? companyRepository.findCompleteActiveCompanies(pageable)
                    : companyRepository.findActiveCompanies(pageable);
        }
        return toResponses(companies);
    }

    public CompanyDirectoryResponse getDirectory(CompanyFilter filter, int offset, int limit) {
        LocalDateTime now = LocalDateTime.now();
        int safeOffset = Math.max(0, offset);
        int safeLimit = JobService.clampLimit(limit);
        Page<Company> page = companyRepository.findAll(
                CompanySpecifications.matching(filter, now),
                new OffsetBasedPageRequest(safeOffset, safeLimit, filter.sort().sort()));
        return new CompanyDirectoryResponse(
                toResponses(page.getContent()),
                page.getTotalElements(),
                safeOffset,
                safeLimit,
                facets(filter, now));
    }

    private CompanyDirectoryResponse.Facets facets(CompanyFilter filter, LocalDateTime now) {
        // Giá trị ngành thô có thể ghép nhiều ngành chuẩn: cộng số lượng cho từng ngành chuẩn trong đó
        Map<String, Long> industryCounts = new HashMap<>();
        for (Tuple row : countBy("industry", filter.withoutIndustry(), now)) {
            for (String label : CompanyIndustries.split(row.get(0, String.class))) {
                industryCounts.merge(label, row.get(1, Long.class), Long::sum);
            }
        }
        List<CompanyDirectoryResponse.Option> industries = CompanyIndustries.CANONICAL.stream()
                .filter(industryCounts::containsKey)
                .map(label -> new CompanyDirectoryResponse.Option(label, label, industryCounts.get(label)))
                .sorted(Comparator.comparingLong(CompanyDirectoryResponse.Option::count).reversed())
                .toList();

        Map<CompanySizeGroup, Long> sizeCounts = new EnumMap<>(CompanySizeGroup.class);
        for (Tuple row : countBy("size", filter.withSize(null), now)) {
            CompanySizeGroup.of(row.get(0, String.class))
                    .ifPresent(group -> sizeCounts.merge(group, row.get(1, Long.class), Long::sum));
        }
        List<CompanyDirectoryResponse.Option> sizes = Arrays.stream(CompanySizeGroup.values())
                .map(group -> new CompanyDirectoryResponse.Option(group.name(), group.label(), sizeCounts.getOrDefault(group, 0L)))
                .toList();

        List<CompanyDirectoryResponse.Option> regions = Arrays.stream(CompanyRegion.values())
                .map(region -> new CompanyDirectoryResponse.Option(
                        region.name(),
                        region.label(),
                        companyRepository.count(CompanySpecifications.matching(filter.withRegion(region), now))))
                .toList();

        long hiring = companyRepository.count(CompanySpecifications.matching(filter.withHiringOnly(true), now));
        return new CompanyDirectoryResponse.Facets(industries, sizes, regions, hiring);
    }

    /** Đếm công ty khớp bộ lọc, nhóm theo một cột; sắp theo số lượng giảm dần. */
    private List<Tuple> countBy(String attribute, CompanyFilter filter, LocalDateTime now) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Company> root = query.from(Company.class);
        Specification<Company> spec = CompanySpecifications.matching(filter, now);
        Expression<String> key = root.get(attribute);
        Expression<Long> count = cb.count(root);
        query.multiselect(key, count)
                .where(spec.toPredicate(root, query, cb))
                .groupBy(key)
                .orderBy(cb.desc(count), cb.asc(key));
        return entityManager.createQuery(query).getResultList();
    }

    public CompanyResponse getCompanyBySlug(String slug) {
        // Remove trailing :number pattern if present (e.g., "slug:1" -> "slug")
        String cleanSlug = slug.replaceAll(":\\d+$", "");
        return companyRepository.findActiveBySlug(cleanSlug)
                .map(company -> CompanyResponse.from(
                        company,
                        jobRepository.findOpenByCompanyIds(List.of(company.getId()), LocalDateTime.now()),
                        countVisibleJobs(List.of(company.getId())).getOrDefault(company.getId(), 0L)))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy công ty"));
    }

    private List<CompanyResponse> toResponses(List<Company> companies) {
        if (companies.isEmpty()) {
            return List.of();
        }
        List<Long> companyIds = companies.stream().map(Company::getId).toList();
        Map<Long, List<Job>> jobsByCompany = jobRepository
                .findOpenByCompanyIds(companyIds, LocalDateTime.now())
                .stream()
                .collect(Collectors.groupingBy(job -> job.getCompany().getId()));
        Map<Long, Long> jobCounts = countVisibleJobs(companyIds);
        return companies.stream()
                .map(company -> CompanyResponse.from(
                        company,
                        jobsByCompany.getOrDefault(company.getId(), List.of()),
                        jobCounts.getOrDefault(company.getId(), 0L)))
                .toList();
    }

    private Map<Long, Long> countVisibleJobs(List<Long> companyIds) {
        return jobRepository.countVisibleByCompanyIds(companyIds).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
    }
}
