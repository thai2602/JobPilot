package com.jobportal.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Turns every exception escaping a controller into an {@link ApiErrorResponse}.
 * <ul>
 *   <li>Spring MVC exceptions (bad JSON, missing params, wrong method, {@link ResponseStatusException}, ...)
 *       keep the status Spring assigns them — handled by {@link ResponseEntityExceptionHandler}.</li>
 *   <li>Bean Validation failures → 400 with {@code fieldErrors}.</li>
 *   <li>{@link ApiException} → its own status and message.</li>
 *   <li>Anything else → 500 with a generic message; details go to the log only.</li>
 * </ul>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    static final String VALIDATION_FAILED = "Dữ liệu không hợp lệ";
    static final String INTERNAL_ERROR = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.";

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<Object> handleApiException(ApiException ex, WebRequest request) {
        if (ex.getStatus().is5xxServerError()) {
            log.error("{} {}: {}", ex.getStatus().value(), path(request), ex.getMessage(), ex);
        }
        return build(ex.getStatus(), ex.getMessage(), null, request);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Object> handleConstraintViolation(ConstraintViolationException ex, WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getConstraintViolations().forEach(violation ->
                fieldErrors.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        return build(HttpStatus.BAD_REQUEST, firstOr(fieldErrors, VALIDATION_FAILED), fieldErrors, request);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Object> handleAccessDenied(AccessDeniedException ex, WebRequest request) {
        return build(HttpStatus.FORBIDDEN, defaultMessage(HttpStatus.FORBIDDEN), null, request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Object> handleAuthentication(AuthenticationException ex, WebRequest request) {
        return build(HttpStatus.UNAUTHORIZED, defaultMessage(HttpStatus.UNAUTHORIZED), null, request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Object> handleDataIntegrity(DataIntegrityViolationException ex, WebRequest request) {
        log.warn("Data integrity violation on {}: {}", path(request), ex.getMostSpecificCause().getMessage());
        return build(HttpStatus.CONFLICT, defaultMessage(HttpStatus.CONFLICT), null, request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleUnexpected(Exception ex, WebRequest request) {
        log.error("Unhandled exception on {}", path(request), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR, null, request);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage());
        }
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));
        return build(HttpStatus.BAD_REQUEST, firstOr(fieldErrors, VALIDATION_FAILED), fieldErrors, request);
    }

    @Override
    protected ResponseEntity<Object> handleHandlerMethodValidationException(
            HandlerMethodValidationException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        ex.getParameterValidationResults().forEach(result -> {
            String name = result.getMethodParameter().getParameterName();
            result.getResolvableErrors().forEach(error ->
                    fieldErrors.putIfAbsent(name != null ? name : "param", error.getDefaultMessage()));
        });
        return build(HttpStatus.BAD_REQUEST, firstOr(fieldErrors, VALIDATION_FAILED), fieldErrors, request);
    }

    /** Every other Spring MVC exception (incl. ResponseStatusException) ends up here. */
    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex, Object body, HttpHeaders headers, HttpStatusCode statusCode, WebRequest request) {
        if (body instanceof ApiErrorResponse) {
            return super.handleExceptionInternal(ex, body, headers, statusCode, request);
        }
        if (statusCode.is5xxServerError()) {
            log.error("{} on {}", statusCode.value(), path(request), ex);
        }
        String message = null;
        if (ex instanceof ResponseStatusException rse) {
            message = rse.getReason();
        } else if (body instanceof ProblemDetail problem) {
            message = problem.getDetail();
        } else if (ex instanceof ErrorResponse errorResponse) {
            message = errorResponse.getBody().getDetail();
        }
        if (message == null || message.isBlank()) {
            message = defaultMessage(statusCode);
        }
        ApiErrorResponse errorBody = body(statusCode, message, null, request);
        return super.handleExceptionInternal(ex, errorBody, headers, statusCode, request);
    }

    private ResponseEntity<Object> build(HttpStatusCode status, String message,
                                         Map<String, String> fieldErrors, WebRequest request) {
        return ResponseEntity.status(status).body(body(status, message, fieldErrors, request));
    }

    private static ApiErrorResponse body(HttpStatusCode status, String message,
                                         Map<String, String> fieldErrors, WebRequest request) {
        HttpStatus resolved = HttpStatus.resolve(status.value());
        return new ApiErrorResponse(
                Instant.now(),
                status.value(),
                resolved != null ? resolved.getReasonPhrase() : String.valueOf(status.value()),
                message,
                path(request),
                fieldErrors == null || fieldErrors.isEmpty() ? null : fieldErrors);
    }

    private static String firstOr(Map<String, String> fieldErrors, String fallback) {
        return fieldErrors.values().stream()
                .filter(message -> message != null && !message.isBlank())
                .findFirst()
                .orElse(fallback);
    }

    static String defaultMessage(HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> "Yêu cầu không hợp lệ";
            case 401 -> "Bạn cần đăng nhập để tiếp tục";
            case 403 -> "Bạn không có quyền thực hiện thao tác này";
            case 404 -> "Không tìm thấy dữ liệu yêu cầu";
            case 409 -> "Dữ liệu bị xung đột, vui lòng thử lại";
            default -> status.is5xxServerError() ? INTERNAL_ERROR : "Yêu cầu thất bại";
        };
    }

    private static String path(WebRequest request) {
        if (request instanceof ServletWebRequest servletWebRequest) {
            HttpServletRequest servletRequest = servletWebRequest.getRequest();
            return servletRequest.getRequestURI();
        }
        return null;
    }
}
