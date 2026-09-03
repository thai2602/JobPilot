package com.jobportal.modules.company;

import com.jobportal.modules.job.JobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CompanyControllerTest {

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private JobRepository jobRepository;

    private CompanyController companyController;

    @BeforeEach
    void setUp() {
        companyController = new CompanyController(companyRepository, jobRepository);
    }

    @Test
    void usesCompleteCompanyQueryWhenRequested() {
        when(companyRepository.findCompleteActiveCompanies(any(Pageable.class))).thenReturn(List.of());

        companyController.getAllCompanies(0, 6, null, true);

        verify(companyRepository).findCompleteActiveCompanies(any(Pageable.class));
        verify(companyRepository, never()).findActiveCompanies(any(Pageable.class));
    }

    @Test
    void keepsCompletenessFilterWhenSearching() {
        when(companyRepository.searchCompleteActiveCompanies(eq("tech"), any(Pageable.class))).thenReturn(List.of());

        companyController.getAllCompanies(0, 6, "tech", true);

        verify(companyRepository).searchCompleteActiveCompanies(eq("tech"), any(Pageable.class));
        verify(companyRepository, never()).searchActiveCompanies(eq("tech"), any(Pageable.class));
    }
}
