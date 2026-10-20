package com.jobportal.modules.chatbot.config;

import com.jobportal.security.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Chặn việc gọi chatbot quá nhiều lần làm cạn tiền API key.
 * Đếm theo cửa sổ cố định 1 phút và 1 ngày, lưu trong bộ nhớ (một instance backend).
 * Chạy sau Spring Security nên SecurityContext đã có user từ JWT.
 */
@Slf4j
public class ChatbotRateLimitInterceptor implements HandlerInterceptor {

    private static final long MINUTE_MS = Duration.ofMinutes(1).toMillis();
    private static final long DAY_MS = Duration.ofDays(1).toMillis();
    private static final int CLEANUP_EVERY = 1_000;

    private final ChatbotRateLimitProperties properties;
    private final CurrentUserService currentUserService;
    private final Clock clock;
    private final ConcurrentMap<String, Usage> usages = new ConcurrentHashMap<>();
    private final AtomicLong requestCount = new AtomicLong();

    public ChatbotRateLimitInterceptor(ChatbotRateLimitProperties properties,
                                       CurrentUserService currentUserService,
                                       Clock clock) {
        this.properties = properties;
        this.currentUserService = currentUserService;
        this.clock = clock;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws IOException {
        if (!properties.isEnabled() || "OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        Long userId = currentUserService.currentUserId().orElse(null);
        String key = userId != null ? "user:" + userId : "ip:" + request.getRemoteAddr();
        ChatbotRateLimitProperties.Limit limit = userId != null ? properties.getAuthenticated() : properties.getAnonymous();

        long now = clock.millis();
        if (requestCount.incrementAndGet() % CLEANUP_EVERY == 0) {
            usages.values().removeIf(usage -> usage.isExpired(now));
        }

        Usage usage = usages.computeIfAbsent(key, k -> new Usage());
        long retryAfterMs = usage.tryAcquire(now, limit);
        if (retryAfterMs == 0) {
            return true;
        }

        log.warn("Chatbot rate limit exceeded for {} on {}", key, request.getRequestURI());
        long retryAfterSeconds = Math.max(1, (retryAfterMs + 999) / 1000);
        String message = userId != null
                ? "Bạn đã gửi quá nhiều yêu cầu tới chatbot. Vui lòng thử lại sau."
                : "Bạn đã gửi quá nhiều yêu cầu tới chatbot. Vui lòng thử lại sau hoặc đăng nhập để có hạn mức cao hơn.";
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader("Retry-After", Long.toString(retryAfterSeconds));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("{\"message\":\"" + message + "\"}");
        return false;
    }

    /** Bộ đếm theo cửa sổ cố định; một khoá chỉ có một Usage nên khoá trên chính nó là đủ. */
    private static final class Usage {
        private long minuteStart;
        private int minuteCount;
        private long dayStart;
        private int dayCount;

        /** @return 0 nếu được phép, ngược lại số ms cần chờ. */
        synchronized long tryAcquire(long now, ChatbotRateLimitProperties.Limit limit) {
            if (now - minuteStart >= MINUTE_MS) {
                minuteStart = now;
                minuteCount = 0;
            }
            if (now - dayStart >= DAY_MS) {
                dayStart = now;
                dayCount = 0;
            }
            if (dayCount >= limit.getPerDay()) {
                return dayStart + DAY_MS - now;
            }
            if (minuteCount >= limit.getPerMinute()) {
                return minuteStart + MINUTE_MS - now;
            }
            minuteCount++;
            dayCount++;
            return 0;
        }

        synchronized boolean isExpired(long now) {
            return now - dayStart >= DAY_MS;
        }
    }
}
