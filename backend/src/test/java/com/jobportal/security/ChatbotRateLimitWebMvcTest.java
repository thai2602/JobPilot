package com.jobportal.security;

import com.jobportal.modules.chatbot.controller.ChatbotController;
import com.jobportal.modules.chatbot.rag.ContextAwareContentRetriever;
import com.jobportal.modules.chatbot.rag.chains.AuditChain;
import com.jobportal.modules.chatbot.rag.chains.RewriteChain;
import com.jobportal.modules.chatbot.service.CvAiService;
import com.jobportal.modules.user.UserRepository;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The public chatbot spends money on every call, so callers are throttled (per IP when anonymous,
 * per account when logged in) and oversized input is rejected before it reaches the LLM.
 * Each test uses its own IP / user id because the counters live for the whole test context.
 */
@WebMvcTest(controllers = ChatbotController.class, properties = {
        "chatbot.rate-limit.anonymous.per-minute=2",
        "chatbot.rate-limit.anonymous.per-day=100",
        "chatbot.rate-limit.authenticated.per-minute=3",
        "chatbot.rate-limit.authenticated.per-day=100",
        "chatbot.rate-limit.max-message-length=20",
        "chatbot.rate-limit.max-document-length=30"
})
@Import({SecurityConfig.class, CurrentUserService.class, ChatbotRateLimitWebMvcTest.MemoryConfig.class})
class ChatbotRateLimitWebMvcTest {

    @TestConfiguration
    static class MemoryConfig {
        @Bean
        ChatMemoryProvider chatMemoryProvider() {
            return memoryId -> MessageWindowChatMemory.withMaxMessages(20);
        }
    }

    @Autowired private MockMvc mockMvc;

    @MockitoBean private CvAiService cvAiService;
    @MockitoBean private AuditChain auditChain;
    @MockitoBean private RewriteChain rewriteChain;
    @MockitoBean private ContextAwareContentRetriever contentRetriever;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    @BeforeEach
    void setUp() {
        when(cvAiService.chat(anyString(), anyString())).thenReturn("reply");
        when(auditChain.executeAudit(anyString())).thenReturn("audit");
    }

    @Test
    void anonymousCallerIsThrottledPerIp() throws Exception {
        chat(fromIp("10.0.0.1")).andExpect(status().isOk());
        chat(fromIp("10.0.0.1")).andExpect(status().isOk());
        chat(fromIp("10.0.0.1"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.message").value(containsString("quá nhiều yêu cầu")));

        // Another visitor is unaffected
        chat(fromIp("10.0.0.2")).andExpect(status().isOk());
    }

    @Test
    void allLlmEndpointsShareOneBudget() throws Exception {
        chat(fromIp("10.0.1.1")).andExpect(status().isOk());
        mockMvc.perform(post("/api/chatbot/audit").with(r -> { r.setRemoteAddr("10.0.1.1"); return r; })
                        .contentType(MediaType.APPLICATION_JSON).content("{\"cvContent\":\"cv\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/chatbot/rewrite").with(r -> { r.setRemoteAddr("10.0.1.1"); return r; })
                        .contentType(MediaType.APPLICATION_JSON).content("{\"bulletPoints\":\"b\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void loggedInUserIsThrottledPerAccountNotPerIp() throws Exception {
        // The anonymous budget of this IP is used up...
        chat(fromIp("10.0.2.1")).andExpect(status().isOk());
        chat(fromIp("10.0.2.1")).andExpect(status().isOk());
        chat(fromIp("10.0.2.1")).andExpect(status().isTooManyRequests());

        // ...but a logged-in user on the same IP has their own, larger budget
        for (int i = 0; i < 3; i++) {
            chat(fromIp("10.0.2.1").with(as(42L))).andExpect(status().isOk());
        }
        chat(fromIp("10.0.2.1").with(as(42L))).andExpect(status().isTooManyRequests());
        // Changing IP does not reset an account's budget
        chat(fromIp("10.0.2.2").with(as(42L))).andExpect(status().isTooManyRequests());
    }

    @Test
    void historyIsNotThrottled() throws Exception {
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(get("/api/chatbot/history").with(as(43L))).andExpect(status().isOk());
        }
    }

    @Test
    void oversizedOrEmptyInputNeverReachesTheLlm() throws Exception {
        mockMvc.perform(chatRequest("{\"message\":\"" + "x".repeat(21) + "\"}").with(as(44L)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.reply").value(containsString("quá dài")));
        mockMvc.perform(chatRequest("{\"message\":\"  \"}").with(as(44L)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/chatbot/audit").with(as(44L))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"cvContent\":\"" + "x".repeat(31) + "\"}"))
                .andExpect(status().isBadRequest());

        verify(cvAiService, never()).chat(anyString(), anyString());
        verify(auditChain, never()).executeAudit(anyString());
    }

    @Test
    void oversizedStreamMessageIsReportedAsSseError() throws Exception {
        mockMvc.perform(post("/api/chatbot/stream").with(as(45L))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"" + "x".repeat(21) + "\"}"))
                .andExpect(content().string(containsString("event:error")));

        verify(cvAiService, never()).chat(anyString(), anyString());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private ResultActions chat(MockHttpServletRequestBuilder request) throws Exception {
        return mockMvc.perform(request);
    }

    private static MockHttpServletRequestBuilder chatRequest(String json) {
        return post("/api/chatbot/chat").contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private static MockHttpServletRequestBuilder fromIp(String ip) {
        return chatRequest("{\"message\":\"hi\"}").with(request -> {
            request.setRemoteAddr(ip);
            return request;
        });
    }

    private static RequestPostProcessor as(long id) {
        return user(new CustomUserDetails(id, "u" + id + "@example.com", "hash", List.of()));
    }
}
