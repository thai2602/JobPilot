package com.jobportal.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Business error with an HTTP status and a message that is safe to show to API clients.
 * Rendered by {@link GlobalExceptionHandler}; for 5xx the cause is logged, never returned.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public ApiException(HttpStatus status, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
