package com.jobportal.security;

import com.jobportal.modules.chatbot.controller.ChatbotController;
import com.jobportal.modules.chatbot.rag.ContextAwareContentRetriever;
import com.jobportal.modules.chatbot.rag.chains.AuditChain;
import com.jobportal.modules.chatbot.rag.chains.RewriteChain;
import com.jobportal.modules.chatbot.service.CvAiService;
import com.jobportal.modules.user.UserRepository;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.store.memory.chat.InMemoryChatMemoryStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Chat memory must be keyed by the JWT user, never by a client-supplied userId: one user can't read,
 * clear or write into another user's conversation, and anonymous callers can't reach real users' memory.
 */
@WebMvcTest(controllers = ChatbotController.class)
@Import({SecurityConfig.class, CurrentUserService.class, ChatbotMemoryIsolationWebMvcTest.MemoryConfig.class})
class ChatbotMemoryIsolationWebMvcTest {

    private static final long USER_A = 1L;
    private static final long USER_B = 2L;
    private static final String SECRET = "B-private-question";

    @TestConfiguration
    static class MemoryConfig {
        @Bean
        ChatMemoryProvider chatMemoryProvider() {
            InMemoryChatMemoryStore store = new InMemoryChatMemoryStore();
            return memoryId -> MessageWindowChatMemory.builder().id(memoryId).maxMessages(20).chatMemoryStore(store).build();
        }
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ChatMemoryProvider chatMemoryProvider;

    @MockitoBean private CvAiService cvAiService;
    @MockitoBean private AuditChain auditChain;
    @MockitoBean private RewriteChain rewriteChain;
    @MockitoBean private ContextAwareContentRetriever contentRetriever;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    @BeforeEach
    void setUp() {
        // Behave like the real AiService: append the exchange to the memory it was given
        when(cvAiService.chat(anyString(), anyString())).thenAnswer(invocation -> {
            var memory = chatMemoryProvider.get(invocation.getArgument(0));
            memory.add(UserMessage.from(invocation.<String>getArgument(1)));
            memory.add(AiMessage.from("reply"));
            return "reply";
        });
    }

    @Test
    void userCannotReadOrClearAnotherUsersHistory() throws Exception {
        chatAs(as(USER_B, "b@example.com"), "{\"message\":\"" + SECRET + "\"}");

        // A tries every userId B might be keyed by; the parameter is ignored and A only sees A's own memory
        for (String victimId : List.of("b@example.com", "2", "user-2")) {
            mockMvc.perform(get("/api/chatbot/history").param("userId", victimId).with(as(USER_A, "a@example.com")))
                    .andExpect(status().isOk())
                    .andExpect(content().string(not(containsString(SECRET))));
            mockMvc.perform(delete("/api/chatbot/history").param("userId", victimId).with(as(USER_A, "a@example.com")))
                    .andExpect(status().isNoContent());
        }

        // B's history survived A's deletes
        mockMvc.perform(get("/api/chatbot/history").with(as(USER_B, "b@example.com")))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString(SECRET)));
    }

    @Test
    void userCannotWriteIntoAnotherUsersMemory() throws Exception {
        chatAs(as(USER_A, "a@example.com"), "{\"message\":\"injected\",\"userId\":\"b@example.com\"}");

        assertThat(lastMemoryId()).isEqualTo("user-" + USER_A);
        assertThat(chatMemoryProvider.get("user-" + USER_B).messages().toString()).doesNotContain("injected");
    }

    @Test
    void anonymousCannotTouchHistory() throws Exception {
        mockMvc.perform(get("/api/chatbot/history").param("userId", "user-2")).andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/chatbot/history").param("userId", "user-2")).andExpect(status().isUnauthorized());
    }

    @Test
    void anonymousChatIsIsolatedFromUserMemory() throws Exception {
        chatAs(null, "{\"message\":\"anon-hello\",\"userId\":\"user-2\",\"conversationId\":\"user-2\"}");

        assertThat(lastMemoryId()).isEqualTo("anon-user-2");
        assertThat(chatMemoryProvider.get("user-" + USER_B).messages().toString()).doesNotContain("anon-hello");
    }

    @Test
    void anonymousWithoutConversationIdGetsThrowawayMemory() throws Exception {
        chatAs(null, "{\"message\":\"hi\",\"conversationId\":\"../../not allowed\"}");

        assertThat(lastMemoryId()).startsWith("anon-").doesNotContain("not allowed");
    }

    @Test
    void conversationIdScopesSideConversationsWithinOwnMemory() throws Exception {
        chatAs(as(USER_A, "a@example.com"), "{\"message\":\"score my cv\",\"conversationId\":\"cv-score-123\"}");

        assertThat(lastMemoryId()).isEqualTo("user-" + USER_A + ":cv-score-123");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void chatAs(RequestPostProcessor principal, String json) throws Exception {
        var request = post("/api/chatbot/chat").contentType(MediaType.APPLICATION_JSON).content(json);
        if (principal != null) request.with(principal);
        mockMvc.perform(request).andExpect(status().isOk());
    }

    private String lastMemoryId() {
        ArgumentCaptor<String> memoryId = ArgumentCaptor.forClass(String.class);
        verify(cvAiService, atLeastOnce()).chat(memoryId.capture(), anyString());
        return memoryId.getValue();
    }

    private static RequestPostProcessor as(long id, String email) {
        return user(new CustomUserDetails(id, email, "hash", List.of()));
    }
}
