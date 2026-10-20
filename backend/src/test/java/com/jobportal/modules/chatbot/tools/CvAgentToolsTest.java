package com.jobportal.modules.chatbot.tools;

import com.jobportal.modules.chatbot.service.CvContextHolder;
import com.jobportal.modules.cv.CvService;
import com.jobportal.modules.cv.UserCv;
import com.jobportal.modules.cv.UserCvRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvAgentToolsTest {

    private static final long USER_A = 1L;
    private static final long CV_OF_A = 10L;
    private static final long CV_OF_B = 20L;

    @Mock
    private CvService cvService;

    @Mock
    private UserCvRepository userCvRepository;

    private CvAgentTools tools;

    @BeforeEach
    void setUp() {
        tools = new CvAgentTools(cvService, userCvRepository);
    }

    @AfterEach
    void tearDown() {
        CvContextHolder.clear();
    }

    @Test
    void anonymousChatGetsNoCvAccess() {
        CvContextHolder.set(CV_OF_B, null);

        assertThat(tools.getCurrentCvContext()).isEqualTo(CvAgentTools.LOGIN_REQUIRED);
        assertThat(tools.getCvDetails(CV_OF_B)).isEqualTo(CvAgentTools.LOGIN_REQUIRED);
        assertThat(tools.getUserCvs()).isEqualTo(CvAgentTools.LOGIN_REQUIRED);
        assertThat(tools.updateCvBasicInfo(CV_OF_B, "x", "y")).isEqualTo(CvAgentTools.LOGIN_REQUIRED);
        verifyNoInteractions(cvService, userCvRepository);
    }

    @Test
    void cannotReadAnotherUsersCvEvenWhenItIsTheActiveCv() {
        CvContextHolder.set(CV_OF_B, USER_A);
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_OF_B, USER_A)).thenReturn(Optional.empty());

        assertThat(tools.getCurrentCvContext()).startsWith("CV not found");
        assertThat(tools.getCvDetails(CV_OF_B)).startsWith("CV not found");
    }

    @Test
    void cannotUpdateAnotherUsersCv() {
        CvContextHolder.set(CV_OF_A, USER_A);
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_OF_B, USER_A)).thenReturn(Optional.empty());

        assertThat(tools.updateCvBasicInfo(CV_OF_B, "Hacker", "pwned")).startsWith("CV not found");
        verify(userCvRepository, never()).save(any());
    }

    @Test
    void readsOwnActiveCv() {
        CvContextHolder.set(CV_OF_A, USER_A);
        UserCv cv = UserCv.builder().id(CV_OF_A).cvName("Mine").fullName("Alice").build();
        when(userCvRepository.findByIdAndUserIdAndIsDeletedFalse(CV_OF_A, USER_A)).thenReturn(Optional.of(cv));

        assertThat(tools.getCurrentCvContext()).contains("CV SNAPSHOT (ID: " + CV_OF_A + ")").contains("Alice");
    }

    @Test
    void listsOnlyCurrentUsersCvs() {
        CvContextHolder.set(null, USER_A);
        when(cvService.getUserCvs(USER_A)).thenReturn(List.of(UserCv.builder().id(CV_OF_A).cvName("Mine").build()));

        assertThat(tools.getUserCvs()).contains("CV ID: " + CV_OF_A);
        verify(cvService).getUserCvs(USER_A);
    }
}
