package com.jobportal.modules.chatbot.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Giới hạn số lần gọi các endpoint chatbot tốn tiền LLM.
 * Người dùng đăng nhập tính theo user id trong JWT, khách tính theo IP.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "chatbot.rate-limit")
public class ChatbotRateLimitProperties {

    private boolean enabled = true;
    private Limit anonymous = new Limit(10, 50);
    private Limit authenticated = new Limit(20, 300);
    /** Độ dài tối đa của tin nhắn chat (/chat, /stream, /eval). */
    private int maxMessageLength = 4_000;
    /** Độ dài tối đa của nội dung CV hoặc bullet gửi lên /audit, /rewrite. */
    private int maxDocumentLength = 20_000;

    @Getter
    @Setter
    public static class Limit {
        private int perMinute;
        private int perDay;

        public Limit() {
        }

        public Limit(int perMinute, int perDay) {
            this.perMinute = perMinute;
            this.perDay = perDay;
        }
    }
}
