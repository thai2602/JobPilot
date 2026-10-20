package com.jobportal.common.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class GlobalExceptionHandlerTest {

    private static final String SECRET = "jdbc:postgresql://db-internal:5432 password=hunter2";

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ThrowingController())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    void validationErrorsAre400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"code\":\"toolong\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").value("/test/validate"))
                .andExpect(jsonPath("$.fieldErrors.name").value("name is required"))
                .andExpect(jsonPath("$.fieldErrors.code").value("code too long"));
    }

    @Test
    void malformedJsonIs400() throws Exception {
        mockMvc.perform(post("/test/validate").contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void missingRequestParamIs400() throws Exception {
        mockMvc.perform(get("/test/param"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void apiExceptionKeepsStatusAndMessage() throws Exception {
        mockMvc.perform(get("/test/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value("Không tìm thấy công việc"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());

        mockMvc.perform(get("/test/bad-request"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Bạn đã lưu công việc này rồi"));
    }

    @Test
    void responseStatusExceptionUsesReasonOrDefault() throws Exception {
        mockMvc.perform(get("/test/rse-reason"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("CV not found"));

        mockMvc.perform(get("/test/rse-no-reason"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.defaultMessage(HttpStatus.UNAUTHORIZED)));
    }

    @Test
    void accessDeniedIs403() throws Exception {
        mockMvc.perform(get("/test/forbidden"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.defaultMessage(HttpStatus.FORBIDDEN)));
    }

    @Test
    void dataIntegrityViolationIs409WithoutDetails() throws Exception {
        mockMvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(content().string(not(containsString(SECRET))));
    }

    @Test
    void unexpectedErrorsAre500WithoutLeakingInternals() throws Exception {
        mockMvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value(GlobalExceptionHandler.INTERNAL_ERROR))
                .andExpect(content().string(not(containsString(SECRET))))
                .andExpect(content().string(not(containsString("IllegalStateException"))))
                .andExpect(content().string(not(containsString("at com.jobportal"))));
    }

    @Test
    void serverSideApiExceptionShowsOnlyItsSafeMessage() throws Exception {
        mockMvc.perform(get("/test/upstream"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Đăng nhập Google thất bại"))
                .andExpect(content().string(not(containsString(SECRET))));
    }

    record Payload(
            @NotBlank(message = "name is required") String name,
            @Size(max = 3, message = "code too long") String code) {
    }

    @RestController
    static class ThrowingController {

        @PostMapping("/test/validate")
        String validate(@Valid @RequestBody Payload payload) {
            return "ok";
        }

        @GetMapping("/test/param")
        String param(@RequestParam Long id) {
            return "ok";
        }

        @GetMapping("/test/not-found")
        String notFound() {
            throw new NotFoundException("Không tìm thấy công việc");
        }

        @GetMapping("/test/bad-request")
        String badRequest() {
            throw new BadRequestException("Bạn đã lưu công việc này rồi");
        }

        @GetMapping("/test/rse-reason")
        String rseReason() {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "CV not found");
        }

        @GetMapping("/test/rse-no-reason")
        String rseNoReason() {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        @GetMapping("/test/forbidden")
        String forbidden() {
            throw new AccessDeniedException("internal rule xyz");
        }

        @GetMapping("/test/conflict")
        String conflict() {
            throw new DataIntegrityViolationException(SECRET);
        }

        @GetMapping("/test/boom")
        String boom() {
            throw new IllegalStateException(SECRET);
        }

        @GetMapping("/test/upstream")
        String upstream() {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Đăng nhập Google thất bại",
                    new java.io.IOException(SECRET));
        }
    }
}
