package com.jobportal.modules.crawler;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

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
    void parsesThousandsSeparatorsAndUsdCurrency() {
        SalaryRange salary = CrawlerNormalizationService.parseSalary("1,000 - 2,500 USD");

        assertThat(salary.minimum()).isEqualByComparingTo(new BigDecimal("1000"));
        assertThat(salary.maximum()).isEqualByComparingTo(new BigDecimal("2500"));
        assertThat(salary.currency()).isEqualTo("USD");
    }
}
