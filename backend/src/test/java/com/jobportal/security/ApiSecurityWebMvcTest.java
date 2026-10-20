package com.jobportal.security;

import com.jobportal.modules.application.Application;
import com.jobportal.modules.application.ApplicationController;
import com.jobportal.modules.application.ApplicationRepository;
import com.jobportal.modules.cv.CvController;
import com.jobportal.modules.cv.CvExtractionAgnosticService;
import com.jobportal.modules.cv.CvService;
import com.jobportal.modules.cv.CvTemplateRepository;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvRepository;
import com.jobportal.modules.job.Job;
import com.jobportal.modules.job.JobRepository;
import com.jobportal.modules.savedjob.SavedJob;
import com.jobportal.modules.savedjob.SavedJobController;
import com.jobportal.modules.savedjob.SavedJobRepository;
import com.jobportal.modules.user.User;
import com.jobportal.modules.user.UserController;
import com.jobportal.modules.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Runs the real SecurityConfig + controllers + CvService against mocked repositories to verify
 * authentication, CV ownership (BOLA) and that no password hash is ever serialized.
 */
@WebMvcTest(controllers = {CvController.class, UserController.class, ApplicationController.class, SavedJobController.class})
@Import({SecurityConfig.class, CurrentUserService.class, CvService.class})
class ApiSecurityWebMvcTest {

    private static final long USER_A = 1L;
    private static final long USER_B = 2L;
    private static final long CV_OF_B = 20L;
    private static final String PASSWORD_HASH = "$2a$10$super-secret-bcrypt-hash";
    private static final String CV_JSON = "{\"cvName\":\"Hacked\",\"userId\":" + USER_B + "}";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean private UserCvRepository userCvRepository;
    @MockitoBean private CvTemplateRepository cvTemplateRepository;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private ApplicationRepository applicationRepository;
    @MockitoBean private SavedJobRepository savedJobRepository;
    @MockitoBean private JobRepository jobRepository;
    @MockitoBean private CvExtractionAgnosticService cvExtractionAgnosticService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private User userA;

    @BeforeEach
    void setUp() {
        userA = newUser(USER_A, "a@example.com");
        User userB = newUser(USER_B, "b@example.com");
        when(userRepository.findById(USER_A)).thenReturn(Optional.of(userA));
        when(userRepository.findById(USER_B)).thenReturn(Optional.of(userB));

        UserCv cvOfB = UserCv.builder().id(CV_OF_B).user(userB).cvName("CV of B").build();
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_OF_B, USER_B)).thenReturn(Optional.of(cvOfB));
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_OF_B, USER_A)).thenReturn(Optional.empty());
        when(userCvRepository.save(any(UserCv.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // ── Anonymous access ─────────────────────────────────────────────────────

    @Test
    void anonymousCannotUseCvEndpoints() throws Exception {
        mockMvc.perform(get("/api/cvs")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/cvs/" + CV_OF_B)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/cvs/user/" + USER_B)).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/cvs").contentType(MediaType.APPLICATION_JSON).content(CV_JSON))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/cvs/" + CV_OF_B).contentType(MediaType.APPLICATION_JSON).content(CV_JSON))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/cvs/" + CV_OF_B)).andExpect(status().isUnauthorized());
        verify(userCvRepository, never()).save(any());
    }

    @Test
    void cvTemplatesStayPublic() throws Exception {
        when(cvTemplateRepository.findAll()).thenReturn(List.of());
        mockMvc.perform(get("/api/cvs/templates")).andExpect(status().isOk());
    }

    @Test
    void anonymousCannotLookUpUsers() throws Exception {
        mockMvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/users/by-email").param("email", "b@example.com"))
                .andExpect(status().isUnauthorized());
    }

    // ── CV ownership (BOLA) ──────────────────────────────────────────────────

    @Test
    void ownerCanReadOwnCv() throws Exception {
        mockMvc.perform(get("/api/cvs/" + CV_OF_B).with(as(USER_B, "b@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(CV_OF_B))
                .andExpect(content().string(not(containsString(PASSWORD_HASH))));
    }

    @Test
    void userCannotReadAnotherUsersCv() throws Exception {
        mockMvc.perform(get("/api/cvs/" + CV_OF_B).with(as(USER_A, "a@example.com")))
                .andExpect(status().isNotFound());
    }

    @Test
    void userCannotUpdateAnotherUsersCv() throws Exception {
        mockMvc.perform(put("/api/cvs/" + CV_OF_B).with(as(USER_A, "a@example.com"))
                        .contentType(MediaType.APPLICATION_JSON).content(CV_JSON))
                .andExpect(status().isNotFound());
        verify(userCvRepository, never()).save(any());
    }

    @Test
    void userCannotDeleteAnotherUsersCv() throws Exception {
        mockMvc.perform(delete("/api/cvs/" + CV_OF_B).with(as(USER_A, "a@example.com")))
                .andExpect(status().isNotFound());
        verify(userCvRepository, never()).save(any());
    }

    @Test
    void listReturnsOnlyCallersCvs() throws Exception {
        when(userCvRepository.findByUserIdAndIsDeletedFalse(USER_A)).thenReturn(List.of());
        mockMvc.perform(get("/api/cvs").with(as(USER_A, "a@example.com")))
                .andExpect(status().isOk())
                .andExpect(content().json("[]"));
        verify(userCvRepository, never()).findByUserIdAndIsDeletedFalse(USER_B);
    }

    @Test
    void createIgnoresUserIdFromBodyAndUsesJwtUser() throws Exception {
        mockMvc.perform(post("/api/cvs").with(as(USER_A, "a@example.com"))
                        .contentType(MediaType.APPLICATION_JSON).content(CV_JSON))
                .andExpect(status().isOk());

        ArgumentCaptor<UserCv> saved = ArgumentCaptor.forClass(UserCv.class);
        verify(userCvRepository).save(saved.capture());
        assertThat(saved.getValue().getUser().getId()).isEqualTo(USER_A);
    }

    // ── No password / user internals in responses ────────────────────────────

    @Test
    void currentUserEndpointReturnsOnlyIdAndEmail() throws Exception {
        mockMvc.perform(get("/api/users/me").with(as(USER_A, "a@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(USER_A))
                .andExpect(jsonPath("$.email").value("a@example.com"))
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString(PASSWORD_HASH))));
    }

    @Test
    void applicationsResponseContainsNoUserOrPassword() throws Exception {
        Application application = new Application();
        application.setId(5L);
        application.setUser(userA);
        application.setJob(newJob());
        when(applicationRepository.findByUserIdOrderByAppliedAtDesc(USER_A)).thenReturn(List.of(application));

        mockMvc.perform(get("/api/applications").with(as(USER_A, "a@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(5))
                .andExpect(jsonPath("$[0].job.title").value("Java Developer"))
                .andExpect(jsonPath("$[0].user").doesNotExist())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString(PASSWORD_HASH))));
    }

    @Test
    void savedJobsResponseContainsNoUserOrPassword() throws Exception {
        SavedJob savedJob = new SavedJob();
        savedJob.setId(6L);
        savedJob.setUser(userA);
        savedJob.setJob(newJob());
        when(savedJobRepository.findByUserIdOrderBySavedAtDesc(USER_A)).thenReturn(List.of(savedJob));

        mockMvc.perform(get("/api/saved-jobs").with(as(USER_A, "a@example.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(6))
                .andExpect(jsonPath("$[0].job.title").value("Java Developer"))
                .andExpect(jsonPath("$[0].user").doesNotExist())
                .andExpect(content().string(not(containsString("password"))))
                .andExpect(content().string(not(containsString(PASSWORD_HASH))));
    }

    @Test
    void applyingWithAnotherUsersCvIsRejected() throws Exception {
        when(jobRepository.findById(100L)).thenReturn(Optional.of(newJob()));

        mockMvc.perform(post("/api/applications").with(as(USER_A, "a@example.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":100,\"cvId\":" + CV_OF_B + "}"))
                .andExpect(status().isBadRequest());
        verify(applicationRepository, never()).save(any());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static RequestPostProcessor as(long id, String email) {
        return user(new CustomUserDetails(id, email, PASSWORD_HASH, List.of()));
    }

    private static User newUser(long id, String email) {
        User user = new User();
        user.setId(id);
        user.setEmail(email);
        user.setPassword(PASSWORD_HASH);
        user.setAuthProvider("LOCAL");
        return user;
    }

    private static Job newJob() {
        Job job = new Job();
        job.setId(100L);
        job.setTitle("Java Developer");
        job.setSlug("java-developer");
        return job;
    }
}
