package com.jobportal.modules.savedjob;

import com.jobportal.security.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/saved-jobs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SavedJobController {

    private final SavedJobService savedJobService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<SavedJobResponse> getMySavedJobs() {
        return savedJobService.listMine(currentUserService.requireUserId());
    }

    @PostMapping
    public SavedJobResponse saveJob(@Valid @RequestBody SavedJobRequest req) {
        return savedJobService.save(currentUserService.requireUser(), req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedJob(@PathVariable Long id) {
        savedJobService.delete(id, currentUserService.requireUserId());
        return ResponseEntity.ok().build();
    }
}
