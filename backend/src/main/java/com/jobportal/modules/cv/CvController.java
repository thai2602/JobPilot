package com.jobportal.modules.cv;

import com.jobportal.modules.cv.dto.UserCvRequestDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cvs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CvController {

    private final CvService cvService;
    private final CvExtractionAgnosticService cvExtractionService;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<UserCv>> getUserCvs(@PathVariable Long userId) {
        return ResponseEntity.ok(cvService.getUserCvs(userId));
    }

    @GetMapping("/templates")
    public ResponseEntity<List<CvTemplate>> getAllTemplates() {
        return ResponseEntity.ok(cvService.getAllTemplates());
    }

    @PostMapping
    public ResponseEntity<UserCv> createCv(@RequestBody UserCvRequestDTO requestDTO) {
        UserCv savedCv = cvService.createOrUpdateCv(null, requestDTO);
        return ResponseEntity.ok(savedCv);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserCv> updateCv(@PathVariable Long id, @RequestBody UserCvRequestDTO requestDTO) {
        UserCv updatedCv = cvService.createOrUpdateCv(id, requestDTO);
        return ResponseEntity.ok(updatedCv);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCv(@PathVariable Long id) {
        cvService.deleteCv(id);
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
