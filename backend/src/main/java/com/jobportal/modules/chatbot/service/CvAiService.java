package com.jobportal.modules.chatbot.service;

import dev.langchain4j.service.MemoryId;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;

import com.jobportal.modules.chatbot.core.Prompts;

public interface CvAiService {

    // Chat thông thường - Không kèm CV_ANALYSIS_PROMPT để tiết kiệm tối đa token
    @SystemMessage(Prompts.SYSTEM_PROMPT)
    String chat(@MemoryId String memoryId, @UserMessage String userMessage);

    // Chat trong giao diện CV Editor - Có kèm CV_ANALYSIS_PROMPT để phân tích sâu
    // và chấm điểm CV
    @SystemMessage(Prompts.SYSTEM_PROMPT + "\n\n" + Prompts.CV_ANALYSIS_PROMPT)
    String chatWithCv(@MemoryId String memoryId, @UserMessage String userMessage);
}
