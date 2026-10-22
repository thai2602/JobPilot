package com.jobportal.modules.crawler;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import com.jobportal.modules.crawler.CrawlerNormalizationService.SalaryRange;

class CrawlerNormalizationServiceTest {

    @Test
    void parsesVietnameseMillionSalary() {
        SalaryRange salary = CrawlerNormalizationService.parseSalary("10 - 15 triệu");

        assertThat(salary.minimum()).isEqualByComparingTo(new BigDecimal("10000000"));
        assertThat(salary.maximum()).isEqualByComparingTo(new BigDecimal("15000000"));
        assertThat(salary.currency()).isEqualTo("VND");
    }

    @Test
    void doesNotMultiplyAlreadyExpandedSalaryTwice() {
        SalaryRange salary = CrawlerNormalizationService.parseSalary("10000000 - 15000000 triệu");

        assertThat(salary.minimum()).isEqualByComparingTo(new BigDecimal("10000000"));
        assertThat(salary.maximum()).isEqualByComparingTo(new BigDecimal("15000000"));
    }

    @Test
    void jobWithoutContentStaysDraftInsteadOfOpenForever() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 21, 12, 0);

        assertThat(CrawlerNormalizationService.jobStatus(null, null, "  ", now)).isEqualTo("DRAFT");
        assertThat(CrawlerNormalizationService.jobStatus(null, "Mô tả công việc", null, now)).isEqualTo("PUBLISHED");
        assertThat(CrawlerNormalizationService.jobStatus(now.plusDays(3), "Mô tả", null, now)).isEqualTo("PUBLISHED");
        assertThat(CrawlerNormalizationService.jobStatus(now.minusDays(1), "Mô tả", null, now)).isEqualTo("CLOSED");
        // An expired crawl is CLOSED even when its content is missing
        assertThat(CrawlerNormalizationService.jobStatus(now.minusDays(1), null, null, now)).isEqualTo("CLOSED");
    }

    @Test
    void parsesThousandsSeparatorsAndUsdCurrency() {
        SalaryRange salary = CrawlerNormalizationService.parseSalary("1,000 - 2,500 USD");

        assertThat(salary.minimum()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(salary.maximum()).isEqualByComparingTo(new BigDecimal("2500"));
        assertThat(salary.currency()).isEqualTo("USD");
    }
}
