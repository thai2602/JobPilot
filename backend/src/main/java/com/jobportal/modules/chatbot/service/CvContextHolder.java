package com.jobportal.modules.chatbot.service;

/**
 * Lưu trữ CV ID đang được chỉnh sửa và ID người dùng đã xác thực (từ JWT) trong ThreadLocal của từng request.
 *
 * Cơ chế:
 *  1. ChatbotController gọi CvContextHolder.set(cvId, ownerUserId) trước khi invoke AI
 *  2. CvAgentTools đọc giá trị từ ThreadLocal và chỉ truy cập CV thuộc ownerUserId
 *  3. Sau khi AI trả lời xong, Controller gọi CvContextHolder.clear() để tránh leak
 *
 * Lưu ý: ThreadLocal chỉ an toàn trong Virtual Thread / Servlet thread.
 * Nếu dùng async/reactive cần truyền qua parameter thay vì ThreadLocal
 * (SSE stream: controller lấy userId trên request thread rồi set lại trên worker thread).
 */
public class CvContextHolder {

    private static final ThreadLocal<Long> ACTIVE_CV_ID = new ThreadLocal<>();
    private static final ThreadLocal<Long> OWNER_USER_ID = new ThreadLocal<>();

    /**
     * @param cvId        CV đang mở (có thể null)
     * @param ownerUserId user đã xác thực; null nếu request ẩn danh → tool sẽ từ chối truy cập CV
     */
    public static void set(Long cvId, Long ownerUserId) {
        ACTIVE_CV_ID.set(cvId);
        OWNER_USER_ID.set(ownerUserId);
    }

    public static Long get() {
        return ACTIVE_CV_ID.get();
    }

    public static Long getOwnerUserId() {
        return OWNER_USER_ID.get();
    }

    public static void clear() {
        ACTIVE_CV_ID.remove();
        OWNER_USER_ID.remove();
    }
}
