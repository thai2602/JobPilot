package com.jobportal.modules.cv;

import com.jobportal.modules.cv.dto.UserCvRequestDTO;
import com.jobportal.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<List<UserCv>> getMyCvs() {
        return ResponseEntity.ok(cvService.getUserCvs(currentUserService.requireUserId()));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<CvTemplate>> getAllTemplates() {
        return ResponseEntity.ok(cvService.getAllTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserCv> getCv(@PathVariable Long id) {
        return ResponseEntity.ok(cvService.getOwnedCv(id, currentUserService.requireUserId()));
    }

    @PostMapping
    public ResponseEntity<UserCv> createCv(@RequestBody UserCvRequestDTO requestDTO) {
        UserCv savedCv = cvService.createCv(currentUserService.requireUserId(), requestDTO);
        return ResponseEntity.ok(savedCv);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserCv> updateCv(@PathVariable Long id, @RequestBody UserCvRequestDTO requestDTO) {
        UserCv updatedCv = cvService.updateCv(id, currentUserService.requireUserId(), requestDTO);
        return ResponseEntity.ok(updatedCv);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCv(@PathVariable Long id) {
        cvService.deleteCv(id, currentUserService.requireUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/extract", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> extractCvData(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        try {
            UserCvRequestDTO extractedData = cvExtractionService.extractCvData(file);
            return ResponseEntity.ok(extractedData);
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Lỗi hệ thống khi trích xuất CV: " + e.getMessage());
        }
    }
}
