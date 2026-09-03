package com.jobportal.modules.chatbot.rag;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;

@Configuration
public class Embeddings {

    @Value("${langchain.embedding.api-key}")
    private String apiKey;

    @Value("${langchain.embedding.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${langchain.embedding.model-name:openai/text-embedding-3-small}")
    private String embeddingModelName;

    @Value("${langchain.dimension:1536}")
    private int dimension;

    /**
     * Xử lý vector embeddings
     */
    @Bean
    public EmbeddingModel ragEmbeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(embeddingModelName)
                .build();
    }
}
