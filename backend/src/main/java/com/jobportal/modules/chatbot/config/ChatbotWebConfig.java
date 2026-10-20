package com.jobportal.modules.chatbot.config;

import com.jobportal.security.CurrentUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Clock;

/** Gắn giới hạn tần suất vào các endpoint chatbot gọi LLM (không áp cho /history). */
@Configuration
@RequiredArgsConstructor
@EnableConfigurationProperties(ChatbotRateLimitProperties.class)
public class ChatbotWebConfig implements WebMvcConfigurer {

    private final ChatbotRateLimitProperties rateLimitProperties;
    private final CurrentUserService currentUserService;

    @Bean
    public ChatbotRateLimitInterceptor chatbotRateLimitInterceptor() {
        return new ChatbotRateLimitInterceptor(rateLimitProperties, currentUserService, Clock.systemUTC());
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(chatbotRateLimitInterceptor())
                .addPathPatterns("/api/chatbot/chat", "/api/chatbot/stream", "/api/chatbot/audit",
                        "/api/chatbot/rewrite", "/api/chatbot/eval");
    }
}
