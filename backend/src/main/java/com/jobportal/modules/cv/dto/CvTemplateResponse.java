package com.jobportal.modules.cv.dto;

import java.util.Map;

/** API view of a CvTemplate; matches ApiCvTemplate in frontend/src/services/cvApi.ts. */
public record CvTemplateResponse(
        Long id,
        String name,
        String description,
        String htmlStructure,
        Map<String, Object> defaultSettings) {
}
