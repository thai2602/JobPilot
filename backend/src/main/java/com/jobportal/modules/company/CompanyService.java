package com.jobportal.modules.company;

import com.jobportal.common.OffsetBasedPageRequest;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.modules.job.JobService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;

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

    public CompanyResponse getCompanyBySlug(String slug) {
        // Remove trailing :number pattern if present (e.g., "slug:1" -> "slug")
        String cleanSlug = slug.replaceAll(":\\d+$", "");
        return companyRepository.findActiveBySlug(cleanSlug)
                .map(company -> CompanyResponse.from(
                        company,
                        jobRepository.findOpenByCompanyIds(List.of(company.getId()), LocalDateTime.now())))
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
        return companies.stream()
                .map(company -> CompanyResponse.from(
                        company,
                        jobsByCompany.getOrDefault(company.getId(), List.of())))
                .toList();
    }
}
