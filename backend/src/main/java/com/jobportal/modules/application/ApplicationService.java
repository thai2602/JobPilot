package com.jobportal.modules.application;

import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.cv.UserCvRepository;
import com.jobportal.modules.job.JobService;
import com.jobportal.modules.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Job applications of the logged-in candidate. Every method is scoped to the given owner. */
@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final ApplicationRepository applicationRepository;
    private final UserCvRepository userCvRepository;
    private final JobService jobService;

    @Transactional(readOnly = true)
    public List<ApplicationResponse> listMine(Long userId) {
        return applicationRepository.findByUserIdOrderByAppliedAtDesc(userId).stream()
                .map(ApplicationResponse::from)
                .toList();
    }

    @Transactional
    public ApplicationResponse apply(User user, ApplicationRequest request) {
        if (applicationRepository.existsByUserIdAndJobId(user.getId(), request.getJobId())) {
            throw new BadRequestException("Bạn đã ứng tuyển công việc này rồi");
        }
        // Only allow attaching a CV the caller owns
        if (request.getCvId() != null
                && userCvRepository.findByIdAndUserIdAndIsDeletedFalse(request.getCvId(), user.getId()).isEmpty()) {
            throw new BadRequestException("CV không hợp lệ");
        }

        Application application = new Application();
        application.setUser(user);
        application.setJob(jobService.requireOpenJob(request.getJobId()));
        application.setCvId(request.getCvId());
        application.setStatus("PENDING");
        applicationRepository.save(application);
        return ApplicationResponse.from(application);
    }

    /** Deletes the application if it belongs to {@code userId}; otherwise 404 (never reveal others' data). */
    @Transactional
    public void delete(Long id, Long userId) {
        Application application = applicationRepository.findById(id)
                .filter(found -> found.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đơn ứng tuyển"));
        applicationRepository.delete(application);
    }
}
