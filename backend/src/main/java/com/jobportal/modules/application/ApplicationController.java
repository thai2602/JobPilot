package com.jobportal.modules.application;

import com.jobportal.security.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ApplicationController {

    private final ApplicationService applicationService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<ApplicationResponse> getMyApplications() {
        return applicationService.listMine(currentUserService.requireUserId());
    }

    @PostMapping
    public ApplicationResponse applyForJob(@Valid @RequestBody ApplicationRequest req) {
        return applicationService.apply(currentUserService.requireUser(), req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Long id) {
        applicationService.delete(id, currentUserService.requireUserId());
        return ResponseEntity.ok().build();
    }
}
