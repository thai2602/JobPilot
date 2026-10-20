package com.jobportal.modules.savedjob;

import com.jobportal.common.exception.BadRequestException;
import com.jobportal.common.exception.NotFoundException;
import com.jobportal.modules.job.JobService;
import com.jobportal.modules.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Bookmarked jobs of the logged-in user. Every method is scoped to the given owner. */
@Service
@RequiredArgsConstructor
public class SavedJobService {

    private final SavedJobRepository savedJobRepository;
    private final JobService jobService;

    @Transactional(readOnly = true)
    public List<SavedJobResponse> listMine(Long userId) {
        return savedJobRepository.findByUserIdOrderBySavedAtDesc(userId).stream()
                .map(SavedJobResponse::from)
                .toList();
    }

    @Transactional
    public SavedJobResponse save(User user, SavedJobRequest request) {
        if (savedJobRepository.existsByUserIdAndJobId(user.getId(), request.getJobId())) {
            throw new BadRequestException("Bạn đã lưu công việc này rồi");
        }
        SavedJob savedJob = new SavedJob();
        savedJob.setUser(user);
        savedJob.setJob(jobService.requireJob(request.getJobId()));
        savedJobRepository.save(savedJob);
        return SavedJobResponse.from(savedJob);
    }

    /** Deletes the saved job if it belongs to {@code userId}; otherwise 404. */
    @Transactional
    public void delete(Long id, Long userId) {
        SavedJob savedJob = savedJobRepository.findById(id)
                .filter(found -> found.getUser().getId().equals(userId))
                .orElseThrow(() -> new NotFoundException("Không tìm thấy công việc đã lưu"));
        savedJobRepository.delete(savedJob);
    }
}
