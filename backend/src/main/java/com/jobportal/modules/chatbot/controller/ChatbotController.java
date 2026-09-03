package com.jobportal.modules.chatbot.controller;

import com.jobportal.modules.chatbot.rag.chains.AuditChain;
import com.jobportal.modules.chatbot.rag.chains.RewriteChain;
import com.jobportal.modules.chatbot.rag.ContextAwareContentRetriever;
import com.jobportal.modules.chatbot.service.CvAiService;
import com.jobportal.modules.chatbot.service.CvContextHolder;
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
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Blocking chat (JSON) — đơn giản, tương thích với client cũ
    // ──────────────────────────────────────────────────────────────────────────

    /**
     * POST /api/chatbot/chat
     * Body: { "message": "...", "userId": "42", "activeCvId": 7 }
     *
     * - userId  → phân tách bộ nhớ hội thoại per-user
     * - activeCvId → inject CV đang mở vào ThreadLocal để AI tự đọc
     */
    @PostMapping("/chat")
    public ResponseEntity<ChatResponse> chat(@RequestBody ChatRequest request) {
        String memoryId = resolveMemoryId(request.getUserId());
        try {
            String reply;
            if (request.getActiveCvId() != null) {
                CvContextHolder.set(request.getActiveCvId());
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
     * GET /api/chatbot/stream?userId=42&activeCvId=7&message=...
     *
     * Trả về text/event-stream.  Frontend lắng nghe bằng EventSource:
     *   const es = new EventSource('/api/chatbot/stream?userId=42&message=...');
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
        String memoryId = resolveMemoryId(request.getUserId());

        executor.submit(() -> {
            try {
                String reply;
                if (request.getActiveCvId() != null) {
                    CvContextHolder.set(request.getActiveCvId());
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
     * GET /api/chatbot/history?userId=42
     * Trả về lịch sử hội thoại của user (tối đa 20 messages theo MessageWindowChatMemory).
     */
    @GetMapping("/history")
    public ResponseEntity<List<HistoryMessage>> getHistory(
            @RequestParam(required = false) String userId) {

        String memoryId = resolveMemoryId(userId);
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
     * DELETE /api/chatbot/history?userId=42
     * Xoá lịch sử hội thoại của user.
     */
    @DeleteMapping("/history")
    public ResponseEntity<Void> clearHistory(
            @RequestParam(required = false) String userId) {

        String memoryId = resolveMemoryId(userId);
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
        String memoryId = resolveMemoryId(request.getUserId());
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
            if (request.getActiveCvId() != null) {
                CvContextHolder.set(request.getActiveCvId());
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

    private String resolveMemoryId(String userId) {
        return (userId != null && !userId.isBlank()) ? userId : "anonymous";
    }

    @Data
    public static class ChatRequest {
        private String message;
        /** ID người dùng để phân tách bộ nhớ. Nếu null → dùng "anonymous" */
        private String userId;
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
