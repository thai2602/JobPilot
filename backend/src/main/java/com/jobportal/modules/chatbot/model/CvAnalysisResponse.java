package com.jobportal.modules.chatbot.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Định nghĩa cấu trúc dữ liệu cho kết quả phân tích/tải CV (Tương đương schemas/Pydantic)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CvAnalysisResponse {
    private String fileId;
    private String fileName;
    private String analysisResult;
    private int score;
}
