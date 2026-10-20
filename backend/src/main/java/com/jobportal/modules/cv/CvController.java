package com.jobportal.modules.cv;

import com.jobportal.modules.cv.dto.CvTemplateResponse;
import com.jobportal.modules.cv.dto.UserCvRequestDTO;
import com.jobportal.modules.cv.dto.UserCvResponse;
import com.jobportal.security.CurrentUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * CV endpoints. Except for templates, every endpoint is scoped to the user in the JWT:
 * CVs owned by someone else are reported as 404.
 */
@RestController
@RequestMapping("/api/cvs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CvController {

    private final CvService cvService;
    private final CvExtractionAgnosticService cvExtractionService;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<UserCvResponse> getMyCvs() {
        return cvService.listMyCvs(currentUserService.requireUserId());
    }

    @GetMapping("/templates")
    public List<CvTemplateResponse> getAllTemplates() {
        return cvService.getAllTemplates();
    }

    @GetMapping("/{id}")
    public UserCvResponse getCv(@PathVariable Long id) {
        return cvService.getOwnedCv(id, currentUserService.requireUserId());
    }

    @PostMapping
    public UserCvResponse createCv(@Valid @RequestBody UserCvRequestDTO requestDTO) {
        return cvService.createCv(currentUserService.requireUserId(), requestDTO);
    }

    @PutMapping("/{id}")
    public UserCvResponse updateCv(@PathVariable Long id, @Valid @RequestBody UserCvRequestDTO requestDTO) {
        return cvService.updateCv(id, currentUserService.requireUserId(), requestDTO);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCv(@PathVariable Long id) {
        cvService.deleteCv(id, currentUserService.requireUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/extract", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserCvRequestDTO extractCvData(@RequestParam("file") MultipartFile file) {
        return cvExtractionService.extractCvData(file);
    }
}
