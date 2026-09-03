package com.jobportal.modules.recommendation;

import com.jobportal.modules.company.Company;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvSkill;
import com.jobportal.modules.job.Job;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JobMatchScorerTest {

    private final JobMatchScorer scorer = new JobMatchScorer();

    @Test
    void scoresMatchingSkillsTitleAndLocationHigher() {
        UserCv cv = UserCv.builder()
                .jobTitle("Frontend Developer")
                .summary("Phát triển giao diện web bằng React và TypeScript")
                .location("Hà Nội")
                .build();
        cv.addSkill(UserCvSkill.builder().skillName("React").build());
        cv.addSkill(UserCvSkill.builder().skillName("TypeScript").build());

        Job matchingJob = job(
                "Frontend Developer",
                "Xây dựng giao diện React",
                "React, TypeScript",
                "Hà Nội");
        Job unrelatedJob = job(
                "Kế toán tổng hợp",
                "Kiểm soát chứng từ kế toán",
                "Excel, nghiệp vụ kế toán",
                "Đà Nẵng");

        JobMatchScorer.MatchResult matching = scorer.score(cv, matchingJob);
        JobMatchScorer.MatchResult unrelated = scorer.score(cv, unrelatedJob);

        assertThat(matching.score()).isGreaterThan(unrelated.score());
        assertThat(matching.matchedSkills()).containsExactly("React", "TypeScript");
        assertThat(matching.reasons()).anyMatch(reason -> reason.contains("Địa điểm"));
    }

    @Test
    void returnsFallbackReasonWhenNoProfileSignalMatches() {
        UserCv cv = UserCv.builder().jobTitle("Thiết kế đồ họa").build();
        Job job = job("Kỹ sư dữ liệu", "Xử lý dữ liệu", "Python, Spark", "TP. HCM");

        JobMatchScorer.MatchResult result = scorer.score(cv, job);

        assertThat(result.score()).isZero();
        assertThat(result.reasons()).containsExactly(
                "Tin tuyển dụng đang mở có nội dung gần nhất với hồ sơ hiện tại");
    }

    private Job job(String title, String description, String requirements, String location) {
        Company company = new Company();
        company.setName("JobPilot Test Company");

        Job job = new Job();
        job.setTitle(title);
        job.setDescription(description);
        job.setRequirements(requirements);
        job.setLocationCity(location);
        job.setCompany(company);
        return job;
    }
}
