package com.jobportal.modules.company;

import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.job.JobRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyServiceTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private JobRepository jobRepository;

    @Mock
    private EntityManager entityManager;

    private CompanyService companyService;

    @BeforeEach
    void setUp() {
        companyService = new CompanyService(companyRepository, jobRepository, entityManager);
    }

    @Test
    void usesCompleteCompanyQueryWhenRequested() {
        when(companyRepository.findCompleteActiveCompanies(any(Pageable.class))).thenReturn(List.of());

        companyService.listCompanies(0, 6, null, true);

        verify(companyRepository).findCompleteActiveCompanies(any(Pageable.class));
        verify(companyRepository, never()).findActiveCompanies(any(Pageable.class));
    }

    @Test
    void keepsCompletenessFilterWhenSearching() {
        when(companyRepository.searchCompleteActiveCompanies(eq("tech"), any(Pageable.class))).thenReturn(List.of());

        companyService.listCompanies(0, 6, "tech", true);

        verify(companyRepository).searchCompleteActiveCompanies(eq("tech"), any(Pageable.class));
        verify(companyRepository, never()).searchActiveCompanies(eq("tech"), any(Pageable.class));
    }

    @Test
    void stripsNumericSuffixFromSlug() {
        Company company = new Company();
        company.setId(7L);
        company.setName("Acme");
        company.setSlug("acme");
        when(companyRepository.findActiveBySlug("acme")).thenReturn(Optional.of(company));
        when(jobRepository.findOpenByCompanyIds(eq(List.of(7L)), any())).thenReturn(List.of());

        CompanyResponse response = companyService.getCompanyBySlug("acme:12");

        assertThat(response.slug()).isEqualTo("acme");
        assertThat(response.positions()).isEmpty();
    }

    @Test
    void unknownSlugIsNotFound() {
        when(companyRepository.findActiveBySlug("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> companyService.getCompanyBySlug("missing"))
                .isInstanceOf(NotFoundException.class);
        verify(jobRepository, never()).findOpenByCompanyIds(anyList(), any());
    }
}
