package com.jobportal.modules.job;

import com.jobportal.common.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Expired jobs stay visible on the board but can no longer receive applications. */
class JobServiceTest {

    private final JobRepository jobRepository = mock(JobRepository.class);
    private final JobService jobService = new JobService(jobRepository);

    @Test
    void openJobAcceptsApplications() {
        Job job = job(7L, "PUBLISHED", LocalDateTime.now().plusDays(3));
        when(jobRepository.findById(7L)).thenReturn(Optional.of(job));

        assertThat(jobService.requireOpenJob(7L)).isSameAs(job);
        assertThat(JobResponse.from(job).expired()).isFalse();
    }

    @Test
    void jobPastDeadlineRejectsApplications() {
        Job job = job(8L, "PUBLISHED", LocalDateTime.now().minusDays(1));
        when(jobRepository.findById(8L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.requireOpenJob(8L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("hết hạn");
        assertThat(JobResponse.from(job).expired()).isTrue();
    }

    @Test
    void closedJobRejectsApplicationsEvenWithoutDeadline() {
        Job job = job(9L, "CLOSED", null);
        when(jobRepository.findById(9L)).thenReturn(Optional.of(job));

        assertThatThrownBy(() -> jobService.requireOpenJob(9L)).isInstanceOf(BadRequestException.class);
        assertThat(JobResponse.from(job).expired()).isTrue();
    }

    private static Job job(Long id, String status, LocalDateTime expiredAt) {
        Job job = new Job();
        job.setId(id);
        job.setStatus(status);
        job.setExpiredAt(expiredAt);
        return job;
    }
}
