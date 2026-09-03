package com.jobportal.modules.recommendation;

import com.jobportal.modules.application.ApplicationRepository;
import com.jobportal.modules.company.Company;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvRepository;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.modules.recommendation.dto.CompanyRecommendationView;
import com.jobportal.modules.recommendation.dto.JobContextView;
import com.jobportal.modules.recommendation.dto.JobRecommendationResult;
import com.jobportal.modules.recommendation.dto.JobRecommendationView;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JobRecommendationService {

    private static final int MAX_RECOMMENDATIONS = 20;
    private static final int MAX_CONTEXT_RESULTS = 12;
    private static final int CANDIDATE_POOL_SIZE = 250;
    private static final int MIN_MATCH_SCORE = 15;

    private final JobRepository jobRepository;
    private final UserCvRepository userCvRepository;
    private final ApplicationRepository applicationRepository;
    private final JobMatchScorer matchScorer;

    @Transactional(readOnly = true)
    public JobRecommendationResult recommendForCv(Long cvId, Long userId, int requestedLimit) {
        UserCv cv = userCvRepository.findById(cvId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy CV."));

        if (Boolean.TRUE.equals(cv.getIsDeleted())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy CV.");
        }
        if (cv.getUser() == null || !cv.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền sử dụng CV này.");
        }

        List<Job> candidates = loadOpenJobs();
        Set<Long> appliedJobIds = new HashSet<>(applicationRepository.findAppliedJobIdsByUserId(userId));
        int limit = clamp(requestedLimit, 1, MAX_RECOMMENDATIONS);

        List<JobRecommendationView> recommendations = candidates.stream()
                .filter(job -> !appliedJobIds.contains(job.getId()))
                .map(job -> toRecommendation(cv, job))
                .filter(recommendation -> recommendation.matchScore() >= MIN_MATCH_SCORE)
                .sorted(Comparator.comparingInt(JobRecommendationView::matchScore).reversed()
                        .thenComparing(JobRecommendationView::jobId, Comparator.reverseOrder()))
                .limit(limit)
                .toList();

        return new JobRecommendationResult(cvId, candidates.size(), LocalDateTime.now(), recommendations);
    }

    @Transactional(readOnly = true)
    public List<JobContextView> searchOpenJobContext(
            String keywords,
            String location,
            String jobLevel,
            int requestedLimit) {
        int limit = clamp(requestedLimit, 1, MAX_CONTEXT_RESULTS);
        Set<String> keywordTokens = tokens(keywords);
        String normalizedLocation = normalize(location);
        String normalizedLevel = normalize(jobLevel);

        return loadOpenJobs().stream()
                .filter(job -> keywordTokens.isEmpty() || keywordTokens.stream().anyMatch(token -> searchableText(job).contains(token)))
                .filter(job -> normalizedLocation.isBlank() || normalize(job.getLocationCity()).contains(normalizedLocation))
                .filter(job -> normalizedLevel.isBlank() || normalize(job.getJobLevel()).contains(normalizedLevel))
                .limit(limit)
                .map(this::toContextView)
                .toList();
    }

    private List<Job> loadOpenJobs() {
        return jobRepository.findOpenJobsForRecommendation(
                LocalDateTime.now(),
                PageRequest.of(0, CANDIDATE_POOL_SIZE));
    }

    private JobRecommendationView toRecommendation(UserCv cv, Job job) {
        JobMatchScorer.MatchResult match = matchScorer.score(cv, job);
        return new JobRecommendationView(
                job.getId(),
                job.getSlug(),
                job.getTitle(),
                job.getJobType(),
                job.getJobLevel(),
                job.getExperienceYears(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getCurrency(),
                job.getLocationCity(),
                job.getLocationAddress(),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                toCompanyView(job.getCompany()),
                match.score(),
                match.matchedSkills(),
                match.reasons());
    }

    private CompanyRecommendationView toCompanyView(Company company) {
        if (company == null) return null;
        return new CompanyRecommendationView(
                company.getId(),
                company.getName(),
                company.getSlug(),
                company.getLogoUrl(),
                company.getSize(),
                company.getDescription(),
                company.getCulture(),
                company.getBenefits());
    }

    private JobContextView toContextView(Job job) {
        Company company = job.getCompany();
        return new JobContextView(
                job.getId(),
                job.getSlug(),
                job.getTitle(),
                company != null ? company.getName() : null,
                company != null ? company.getSlug() : null,
                company != null ? compact(company.getDescription(), 350) : null,
                company != null ? compact(company.getCulture(), 250) : null,
                job.getJobType(),
                job.getJobLevel(),
                job.getExperienceYears(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getCurrency(),
                job.getLocationCity(),
                compact(job.getDescription(), 700),
                compact(job.getRequirements(), 700),
                compact(job.getBenefits(), 400));
    }

    private String searchableText(Job job) {
        Company company = job.getCompany();
        return normalize(String.join(" ", nonNullValues(
                job.getTitle(),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                job.getJobLevel(),
                job.getJobType(),
                job.getLocationCity(),
                company != null ? company.getName() : null,
                company != null ? company.getDescription() : null,
                company != null ? company.getCulture() : null)));
    }

    private List<String> nonNullValues(String... values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            if (value != null && !value.isBlank()) result.add(value);
        }
        return result;
    }

    private Set<String> tokens(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) return Set.of();
        Set<String> result = new HashSet<>();
        for (String token : normalized.split("[^\\p{L}\\p{N}+#.]+")) {
            if (token.length() >= 2) result.add(token);
        }
        return result;
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd');
        return normalized.replaceAll("\\p{M}+", "").trim();
    }

    private String compact(String value, int maxLength) {
        if (value == null || value.isBlank()) return value;
        String compacted = value.replaceAll("\\s+", " ").trim();
        return compacted.length() <= maxLength
                ? compacted
                : compacted.substring(0, maxLength - 1).trim() + "…";
    }

    private int clamp(int value, int minimum, int maximum) {
        return Math.max(minimum, Math.min(maximum, value));
    }
}
