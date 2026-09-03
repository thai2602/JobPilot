package com.jobportal.modules.chatbot.service;

/**
 * Lưu trữ CV ID đang được chỉnh sửa trong ThreadLocal của từng request.
 *
 * Cơ chế:
 *  1. ChatbotController.chat() gọi CvContextHolder.set(cvId) trước khi invoke AI
 *  2. CvAgentTools.getCurrentCvContext() đọc giá trị từ ThreadLocal
 *  3. Sau khi AI trả lời xong, Controller gọi CvContextHolder.clear() để tránh leak
 *
 * Lưu ý: ThreadLocal chỉ an toàn trong Virtual Thread / Servlet thread.
 * Nếu dùng async/reactive cần truyền qua parameter thay vì ThreadLocal.
 */
public class CvContextHolder {

    private static final ThreadLocal<Long> ACTIVE_CV_ID = new ThreadLocal<>();

    public static void set(Long cvId) {
        ACTIVE_CV_ID.set(cvId);
    }

    public static Long get() {
        return ACTIVE_CV_ID.get();
    }

    public static void clear() {
        ACTIVE_CV_ID.remove();
    }
}
