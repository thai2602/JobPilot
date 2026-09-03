package com.jobportal.modules.recommendation;

import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvEducation;
import com.jobportal.modules.cv.UserCvExperience;
import com.jobportal.modules.cv.UserCvProject;
import com.jobportal.modules.cv.UserCvSkill;
import com.jobportal.modules.job.Job;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class JobMatchScorer {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern NON_TOKEN = Pattern.compile("[^\\p{L}\\p{N}+#.]+");
    private static final Set<String> STOP_WORDS = Set.of(
            "va", "voi", "cua", "cho", "cac", "mot", "nhung", "trong", "tai", "theo",
            "la", "co", "duoc", "tu", "den", "and", "or", "the", "for", "with", "of",
            "to", "in", "a", "an", "on", "at", "is", "are", "job", "work", "nhan", "vien");

    public MatchResult score(UserCv cv, Job job) {
        List<String> cvSkills = extractSkills(cv);
        String normalizedJobText = normalizePhrase(joinJobText(job));

        List<String> matchedSkills = cvSkills.stream()
                .filter(skill -> normalizedJobText.contains(normalizePhrase(skill)))
                .distinct()
                .limit(6)
                .toList();

        double skillRatio = cvSkills.isEmpty() ? 0 : (double) matchedSkills.size() / cvSkills.size();
        double titleRatio = overlapRatio(tokens(cv.getJobTitle()), tokens(join(job.getTitle(), job.getRequirements())));
        double profileRatio = overlapRatio(tokens(joinCvText(cv)), tokens(joinJobText(job)));
        boolean locationMatches = locationMatches(cv.getLocation(), job.getLocationCity());

        int score = (int) Math.round(
                skillRatio * 45
                        + titleRatio * 30
                        + profileRatio * 15
                        + (locationMatches ? 10 : 0));
        score = Math.max(0, Math.min(100, score));

        List<String> reasons = new ArrayList<>();
        if (!matchedSkills.isEmpty()) {
            reasons.add("Khớp kỹ năng: " + String.join(", ", matchedSkills));
        }
        if (titleRatio >= 0.35) {
            reasons.add("Vị trí phù hợp với định hướng nghề nghiệp trong CV");
        }
        if (profileRatio >= 0.20) {
            reasons.add("Kinh nghiệm hoặc dự án có từ khóa gần với yêu cầu tuyển dụng");
        }
        if (locationMatches) {
            reasons.add("Địa điểm làm việc phù hợp với hồ sơ");
        }
        if (reasons.isEmpty()) {
            reasons.add("Tin tuyển dụng đang mở có nội dung gần nhất với hồ sơ hiện tại");
        }

        return new MatchResult(score, matchedSkills, reasons);
    }

    private List<String> extractSkills(UserCv cv) {
        if (cv.getSkills() == null) return List.of();
        return cv.getSkills().stream()
                .map(UserCvSkill::getSkillName)
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    private String joinCvText(UserCv cv) {
        List<String> values = new ArrayList<>();
        values.add(cv.getJobTitle());
        values.add(cv.getSummary());
        values.add(cv.getLocation());

        if (cv.getSkills() != null) {
            cv.getSkills().forEach(skill -> values.add(skill.getSkillName()));
        }
        if (cv.getExperiences() != null) {
            for (UserCvExperience experience : cv.getExperiences()) {
                values.add(experience.getPosition());
                values.add(experience.getDescription());
                addAll(values, experience.getTechnologies());
            }
        }
        if (cv.getProjects() != null) {
            for (UserCvProject project : cv.getProjects()) {
                values.add(project.getName());
                values.add(project.getDescription());
                addAll(values, project.getTechnologies());
            }
        }
        if (cv.getEducations() != null) {
            for (UserCvEducation education : cv.getEducations()) {
                values.add(education.getMajor());
                values.add(education.getSchool());
            }
        }
        if (cv.getCvData() != null) values.add(cv.getCvData().toString());
        return join(values.toArray(String[]::new));
    }

    private String joinJobText(Job job) {
        return join(
                job.getTitle(),
                job.getDescription(),
                job.getRequirements(),
                job.getBenefits(),
                job.getJobLevel(),
                job.getJobType(),
                job.getLocationCity(),
                job.getCompany() != null ? job.getCompany().getName() : null,
                job.getCompany() != null ? job.getCompany().getDescription() : null,
                job.getCompany() != null ? job.getCompany().getCulture() : null);
    }

    private boolean locationMatches(String cvLocation, String jobLocation) {
        if (cvLocation == null || cvLocation.isBlank() || jobLocation == null || jobLocation.isBlank()) return false;
        String cvValue = normalizePhrase(cvLocation);
        String jobValue = normalizePhrase(jobLocation);
        return cvValue.contains(jobValue) || jobValue.contains(cvValue);
    }

    private double overlapRatio(Set<String> source, Set<String> target) {
        if (source.isEmpty() || target.isEmpty()) return 0;
        long matches = source.stream().filter(target::contains).count();
        return Math.min(1, (double) matches / source.size());
    }

    private Set<String> tokens(String value) {
        if (value == null || value.isBlank()) return Set.of();
        return Arrays.stream(NON_TOKEN.split(normalizePhrase(value)))
                .map(String::trim)
                .filter(token -> token.length() >= 2)
                .filter(token -> !STOP_WORDS.contains(token))
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private String normalizePhrase(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd');
        return DIACRITICS.matcher(normalized).replaceAll("")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String join(String... values) {
        return Arrays.stream(values)
                .filter(value -> value != null && !value.isBlank())
                .collect(Collectors.joining(" "));
    }

    private void addAll(List<String> target, String[] values) {
        if (values != null) target.addAll(Arrays.asList(values));
    }

    public record MatchResult(int score, List<String> matchedSkills, List<String> reasons) {
    }
}
