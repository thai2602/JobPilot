package com.jobportal.modules.chatbot.rag.chains;

import com.jobportal.modules.chatbot.core.Prompts;
import dev.langchain4j.model.chat.ChatLanguageModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RewriteChain {

    private final ChatLanguageModel chatLanguageModel;

    /**
     * AI Agent for rewriting CV bullet points
     */
    public String executeRewrite(String bulletPoints) {
        String prompt = Prompts.REWRITE_PROMPT + "\n\nBullet Points:\n" + bulletPoints;
        return chatLanguageModel.generate(prompt);
    }
}
