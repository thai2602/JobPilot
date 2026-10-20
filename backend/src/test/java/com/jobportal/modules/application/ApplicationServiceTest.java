package com.jobportal.modules.application;

import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvRepository;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobService;
import com.jobportal.modules.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationServiceTest {

    private static final long USER_ID = 1L;
    private static final long OTHER_USER_ID = 2L;
    private static final long JOB_ID = 100L;
    private static final long CV_ID = 10L;

    @Mock private ApplicationRepository applicationRepository;
    @Mock private UserCvRepository userCvRepository;
    @Mock private JobService jobService;

    private ApplicationService applicationService;
    private User user;

    @BeforeEach
    void setUp() {
        applicationService = new ApplicationService(applicationRepository, userCvRepository, jobService);
        user = new User();
        user.setId(USER_ID);
    }

    @Test
    void appliesWithOwnCv() {
        Job job = new Job();
        job.setId(JOB_ID);
        job.setTitle("Java Developer");
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_ID, USER_ID))
                .thenReturn(Optional.of(new UserCv()));
        when(jobService.requireJob(JOB_ID)).thenReturn(job);

        ApplicationResponse response = applicationService.apply(user, request(JOB_ID, CV_ID));

        ArgumentCaptor<Application> saved = ArgumentCaptor.forClass(Application.class);
        verify(applicationRepository).save(saved.capture());
        assertThat(saved.getValue().getUser()).isSameAs(user);
        assertThat(saved.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(response.job().title()).isEqualTo("Java Developer");
        assertThat(response.cvId()).isEqualTo(CV_ID);
    }

    @Test
    void rejectsDuplicateApplication() {
        when(applicationRepository.existsByUserIdAndJobId(USER_ID, JOB_ID)).thenReturn(true);

        assertThatThrownBy(() -> applicationService.apply(user, request(JOB_ID, null)))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã ứng tuyển");
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void rejectsCvOfAnotherUser() {
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_ID, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> applicationService.apply(user, request(JOB_ID, CV_ID)))
                .isInstanceOf(BadRequestException.class);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void unknownJobIsNotFound() {
        when(jobService.requireJob(JOB_ID)).thenThrow(new NotFoundException("Không tìm thấy công việc"));

        assertThatThrownBy(() -> applicationService.apply(user, request(JOB_ID, null)))
                .isInstanceOf(NotFoundException.class);
        verify(applicationRepository, never()).save(any());
    }

    @Test
    void cannotDeleteAnotherUsersApplication() {
        User other = new User();
        other.setId(OTHER_USER_ID);
        Application application = new Application();
        application.setId(5L);
        application.setUser(other);
        when(applicationRepository.findById(5L)).thenReturn(Optional.of(application));

        assertThatThrownBy(() -> applicationService.delete(5L, USER_ID)).isInstanceOf(NotFoundException.class);
        verify(applicationRepository, never()).delete(any());
    }

    @Test
    void ownerCanDeleteApplication() {
        Application application = new Application();
        application.setId(5L);
        application.setUser(user);
        when(applicationRepository.findById(5L)).thenReturn(Optional.of(application));

        applicationService.delete(5L, USER_ID);

        verify(applicationRepository).delete(application);
    }

    private static ApplicationRequest request(Long jobId, Long cvId) {
        ApplicationRequest request = new ApplicationRequest();
        request.setJobId(jobId);
        request.setCvId(cvId);
        return request;
    }
}
