package com.jobportal.modules.company;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

import com.jobportal.common.OffsetBasedPageRequest;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/companies")
@CrossOrigin(origins = "*")
public class CompanyController {

    private final CompanyRepository companyRepository;
    private final JobRepository jobRepository;

    public CompanyController(CompanyRepository companyRepository, JobRepository jobRepository) {
        this.companyRepository = companyRepository;
        this.jobRepository = jobRepository;
    }

    @GetMapping
    public List<CompanyResponse> getAllCompanies(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean completeOnly) {
        Pageable pageable = new OffsetBasedPageRequest(Math.max(0, offset), clampLimit(limit));
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

    @GetMapping("/{slug}")
    public org.springframework.http.ResponseEntity<CompanyResponse> getCompanyBySlug(@PathVariable String slug) {
        // Remove trailing :number pattern if present (e.g., "slug:1" -> "slug")
        String cleanSlug = slug.replaceAll(":\\d+$", "");
        
        return companyRepository.findActiveBySlug(cleanSlug)
                .map(company -> CompanyResponse.from(
                        company,
                        jobRepository.findOpenByCompanyIds(List.of(company.getId()), LocalDateTime.now())))
                .map(org.springframework.http.ResponseEntity::ok)
                .orElse(org.springframework.http.ResponseEntity.notFound().build());
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

    private int clampLimit(int limit) {
        return Math.min(Math.max(limit, 1), 100);
    }
}
