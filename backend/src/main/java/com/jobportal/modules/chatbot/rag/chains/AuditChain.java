package com.jobportal.modules.chatbot.rag.chains;

import com.jobportal.modules.chatbot.core.Prompts;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AuditChain {

    private final ChatLanguageModel chatLanguageModel;

    /**
     * AI Agent for auditing CV
     */
    public String executeAudit(String cvContent) {
        String prompt = Prompts.AUDIT_PROMPT + "\n\nCV Content:\n" + cvContent;
        return chatLanguageModel.generate(prompt);
    }
}
