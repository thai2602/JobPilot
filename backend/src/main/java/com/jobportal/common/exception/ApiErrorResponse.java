package com.jobportal.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

/**
 * Single error body for every API failure. The frontend reads {@code message}
 * (see extractErrorMessage in frontend/src/services/httpClient.ts).
 *
 * @param fieldErrors only for validation failures: field path → first violation message
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors) {
}
