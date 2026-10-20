package com.jobportal.modules.chatbot.controller;

import com.jobportal.modules.chatbot.rag.chains.AuditChain;
import com.jobportal.modules.chatbot.rag.chains.RewriteChain;
import com.jobportal.modules.chatbot.rag.ContextAwareContentRetriever;
import com.jobportal.modules.chatbot.service.CvAiService;
import com.jobportal.modules.chatbot.service.CvContextHolder;
import com.jobportal.security.CurrentUserService;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;
import dev.langchain4j.data.segment.TextSegment;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final CvAiService cvAiService;
    private final AuditChain auditChain;
    private final RewriteChain rewriteChain;
    private final ChatMemoryProvider chatMemoryProvider;
    private final ContextAwareContentRetriever contentRetriever;
    private final CurrentUserService currentUserService;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Blocking chat (JSON) — đơn giản, tương thích với client cũ
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/chatbot/chat
     * Body: { "message": "...", "conversationId": "...", "activeCvId": 7 }
     *
     * - Bộ nhớ hội thoại lấy theo user trong JWT (xem resolveMemoryId), không tin userId từ client
     * - activeCvId → inject CV đang mở vào ThreadLocal để AI tự đọc
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String memoryId = resolveMemoryId(request.getConversationId());
        Long ownerUserId = currentUserService.currentUserId().orElse(null);
        try {
            String reply;
            // Always bind the JWT user so CV tools can enforce ownership (null = anonymous → no CV access)
            CvContextHolder.set(request.getActiveCvId(), ownerUserId);
            if (request.getActiveCvId() != null) {
                reply = cvAiService.chatWithCv(memoryId, request.getMessage());
            } else {
                reply = cvAiService.chat(memoryId, request.getMessage());
            }
            return ResponseEntity.ok(new ChatResponse(reply));
        } catch (Exception e) {
            log.error("Chat error for memoryId={}: {}", memoryId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(new ChatResponse("Lỗi xử lý yêu cầu: " + e.getMessage()));
        } finally {
            CvContextHolder.clear();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. SSE Streaming chat — trả từng token khi LLM sinh ra
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/chatbot/stream  (body giống /chat)
     *
     * Trả về text/event-stream.  Frontend đọc stream (fetch) với các event:
     *   es.addEventListener('token', e => append(e.data));
     *   es.addEventListener('done',  e => es.close());
     *   es.addEventListener('error', e => showError(e.data));
     *
     * Ghi chú: LangChain4j bản local (LM Studio) chưa hỗ trợ StreamingChatLanguageModel
     * nên ở đây ta simulate bằng cách chạy blocking call trên thread riêng rồi
     * gửi toàn bộ response dưới dạng 1 "token" event + "done" event.
     * Khi nâng lên OpenAI / Mistral API thật có hỗ trợ streaming, chỉ cần swap
     * ChatLanguageModel → StreamingChatLanguageModel và thay logic bên dưới.
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamChat(@RequestBody ChatRequest request) {

        SseEmitter emitter = new SseEmitter(300_000L); // 5 phút timeout
        String memoryId = resolveMemoryId(request.getConversationId());
        Long ownerUserId = currentUserService.currentUserId().orElse(null);

        executor.submit(() -> {
            try {
                String reply;
                // Always bind the JWT user so CV tools can enforce ownership (null = anonymous → no CV access)
                CvContextHolder.set(request.getActiveCvId(), ownerUserId);
                if (request.getActiveCvId() != null) {
                    reply = cvAiService.chatWithCv(memoryId, request.getMessage());
                } else {
                    reply = cvAiService.chat(memoryId, request.getMessage());
                }

                // Tách theo từng dòng, giữ nguyên cấu trúc markdown
                String[] lines = reply.split("\n", -1);
                for (int i = 0; i < lines.length; i++) {
                    String line = lines[i];
                    // Gửi nội dung dòng (kể cả dòng trống để giữ khoảng trắng markdown)
                    // Append \n trở lại trừ dòng cuối
                    String tokenData = (i < lines.length - 1) ? line + "\n" : line;
                    emitter.send(SseEmitter.event()
                            .name("token")
                            .data(tokenData));
                    Thread.sleep(25); // delay nhỏ để frontend render dần
                }
                emitter.send(SseEmitter.event().name("done").data("[END]"));
                emitter.complete();

            } catch (Exception e) {
                log.error("SSE stream error for memoryId={}: {}", memoryId, e.getMessage());
                try {
                    emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                } catch (IOException ignored) {}
                emitter.completeWithError(e);
            } finally {
                CvContextHolder.clear();
            }
        });

        return emitter;
    }


    // ──────────────────────────────────────────────────────────────────────────
    // 3. Conversation History API
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/chatbot/history  (cần JWT)
     * Trả về lịch sử hội thoại chính của user đang đăng nhập (tối đa 20 messages theo MessageWindowChatMemory).
     */
    @GetMapping("/history")
    public ResponseEntity<List<HistoryMessage>> getHistory() {

        String memoryId = userMemoryId(currentUserService.requireUserId());
        try {
            // Lấy memory của user — ChatMemoryProvider tạo mới nếu chưa tồn tại
            ChatMemory memory = chatMemoryProvider.get(memoryId);
            List<HistoryMessage> history = memory.messages().stream()
                    .map(msg -> {
                        String role = (msg instanceof AiMessage)   ? "assistant"
                                    : (msg instanceof UserMessage) ? "user"
                                    : "system";
                        String text = msg instanceof AiMessage
                                ? ((AiMessage) msg).text()
                                : msg.toString();
                        return new HistoryMessage(role, text);
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(history);
        } catch (Exception e) {
            log.error("History fetch error for memoryId={}: {}", memoryId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * DELETE /api/chatbot/history  (cần JWT)
     * Xoá lịch sử hội thoại chính của user đang đăng nhập.
     */
    @DeleteMapping("/history")
    public ResponseEntity<Void> clearHistory() {

        String memoryId = userMemoryId(currentUserService.requireUserId());
        try {
            chatMemoryProvider.get(memoryId).clear();
            log.info("Cleared chat history for memoryId={}", memoryId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            log.error("History clear error for memoryId={}: {}", memoryId, e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. AuditChain & RewriteChain (không đổi)
    // ──────────────────────────────────────────────────────────────────────────

    @PostMapping("/audit")
    public ResponseEntity<ChatResponse> auditCv(@RequestBody AuditRequest request) {
        if (request.getCvContent() == null || request.getCvContent().isBlank()) {
            return ResponseEntity.badRequest().body(new ChatResponse("cvContent không được để trống."));
        }
        try {
            return ResponseEntity.ok(new ChatResponse(auditChain.executeAudit(request.getCvContent())));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new ChatResponse("Lỗi audit CV: " + e.getMessage()));
        }
    }

    @PostMapping("/rewrite")
    public ResponseEntity<ChatResponse> rewriteBullets(@RequestBody RewriteRequest request) {
        if (request.getBulletPoints() == null || request.getBulletPoints().isBlank()) {
            return ResponseEntity.badRequest().body(new ChatResponse("bulletPoints không được để trống."));
        }
        try {
            return ResponseEntity.ok(new ChatResponse(rewriteChain.executeRewrite(request.getBulletPoints())));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new ChatResponse("Lỗi rewrite: " + e.getMessage()));
        }
    }

    @PostMapping("/eval")
    public ResponseEntity<EvalResponse> evaluate(@RequestBody ChatRequest request) {
        String memoryId = resolveMemoryId(request.getConversationId());
        Long ownerUserId = currentUserService.currentUserId().orElse(null);
        try {
            // 1. Retrieve RAG contexts
            Query query = Query.from(request.getMessage());
            ContextAwareContentRetriever.RetrievalResult retrieval = contentRetriever.retrieveWithTrace(query);
            List<Content> retrieved = retrieval.contents();
            List<String> contexts = retrieved.stream()
                    .map(Content::textSegment)
                    .map(TextSegment::text)
                    .collect(Collectors.toList());

            // 2. Generate LLM answer
            String answer;
            // Always bind the JWT user so CV tools can enforce ownership (null = anonymous → no CV access)
            CvContextHolder.set(request.getActiveCvId(), ownerUserId);
            if (request.getActiveCvId() != null) {
                answer = cvAiService.chatWithCv(memoryId, request.getMessage());
            } else {
                answer = cvAiService.chat(memoryId, request.getMessage());
            }

            return ResponseEntity.ok(new EvalResponse(answer, contexts, retrieval.trace()));
        } catch (Exception e) {
            log.error("Evaluation error for memoryId={}: {}", memoryId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        } finally {
            CvContextHolder.clear();
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // Helpers & DTOs
    // ──────────────────────────────────────────────────────────────────────────

    /** Client-chosen conversation ids are opaque tokens; anything else is dropped. */
    private static final Pattern CONVERSATION_ID = Pattern.compile("[A-Za-z0-9_:.-]{1,128}");

    /**
     * Memory id comes from the JWT, never from a client-sent userId:
     * - authenticated → "user-<id>" (or "user-<id>:<conversationId>" for side conversations such as CV scoring)
     * - anonymous     → "anon-<conversationId>", where the client sends a random per-browser id;
     *                   without a usable id the request gets a throwaway memory.
     * The "user-"/"anon-" prefixes keep the two namespaces from colliding.
     */
    private String resolveMemoryId(String conversationId) {
        String conversation = (conversationId != null && CONVERSATION_ID.matcher(conversationId).matches())
                ? conversationId : null;
        return currentUserService.currentUserId()
                .map(id -> conversation == null ? userMemoryId(id) : userMemoryId(id) + ":" + conversation)
                .orElseGet(() -> "anon-" + (conversation != null ? conversation : UUID.randomUUID()));
    }

    private static String userMemoryId(Long userId) {
        return "user-" + userId;
    }

    @Data
    public static class ChatRequest {
        private String message;
        /**
         * Optional conversation id. Logged-in users: selects a side conversation inside their own memory.
         * Anonymous users: a random per-browser id. A client-sent userId is ignored.
         */
        private String conversationId;
        /** CV ID đang được mở trong editor — auto-inject vào context AI */
        private Long activeCvId;
    }

    @Data
    public static class AuditRequest {
        private String cvContent;
    }

    @Data
    public static class RewriteRequest {
        private String bulletPoints;
    }

    @Data
    public static class ChatResponse {
        private final String reply;
    }

    @Data
    public static class HistoryMessage {
        private final String role;   // "user" | "assistant" | "system"
        private final String content;
    }

    @Data
    public static class EvalResponse {
        private final String answer;
        private final List<String> contexts;
        private final ContextAwareContentRetriever.RetrievalTrace trace;
    }
}
