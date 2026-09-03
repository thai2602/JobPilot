package com.jobportal.modules.chatbot.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobportal.modules.chatbot.rag.ContextAwareContentRetriever;
import com.jobportal.modules.chatbot.rag.HybridContentRetriever;
import com.jobportal.modules.chatbot.rag.PostgresFullTextContentRetriever;
import com.jobportal.modules.chatbot.rag.RerankContentRetriever;
import com.jobportal.modules.chatbot.service.CvAiService;
import com.jobportal.modules.chatbot.service.RagService;
import com.jobportal.modules.chatbot.tools.CvAgentTools;
import com.jobportal.modules.recommendation.JobRecommendationTools;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.store.memory.chat.InMemoryChatMemoryStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
@EnableConfigurationProperties(RagRetrievalProperties.class)
public class ChatbotConfig {

    @Value("${langchain.chat.api-key}")
    private String apiKey;

    @Value("${langchain.chat.base-url:https://openrouter.ai/api/v1}")
    private String baseUrl;

    @Value("${langchain.chat.model-name:google/gemma-4-31b-it}")
    private String modelName;

    @Value("${rag.pgvector.job-table:rag_job_embeddings}")
    private String jobVectorTable;

    @Value("${rag.pgvector.historical-job-table:rag_historical_job_embeddings}")
    private String historicalJobVectorTable;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .temperature(0.0)
                .timeout(java.time.Duration.ofMinutes(5))
                .build();
    }

    /**
     * ChatMemoryProvider tạo ra bộ nhớ độc lập cho mỗi memoryId (userId /
     * sessionId).
     */
    @Bean
    public ChatMemoryProvider chatMemoryProvider() {
        InMemoryChatMemoryStore sharedStore = new InMemoryChatMemoryStore();
        return memoryId -> MessageWindowChatMemory.builder()
                .id(memoryId)
                .maxMessages(20)
                .chatMemoryStore(sharedStore)
                .build();
    }

    // ── HR / Active Job / Historical Job Retrievers ─────────────────────────

    /**
     * HR Knowledge Retriever: truy vấn tiêu chí chấm CV, ATS rules, red-flags.
     * minScore cao hơn (0.70) vì HR docs rất specific, không cần lấy result mờ.
     */
    @Bean("hrContentRetriever")
    public ContentRetriever hrContentRetriever(RagService ragService, RagRetrievalProperties properties) {
        RagRetrievalProperties.Store settings = properties.getHr();
        validateStoreSettings("hr", settings);
        ContentRetriever rawRetriever = EmbeddingStoreContentRetriever.builder()
                .embeddingStore(ragService.getHrKnowledgeStore())
                .embeddingModel(ragService.getEmbeddingModel())
                .maxResults(settings.getMaxCandidates())
                .minScore(settings.getMinScore())
                .build();

        return new RerankContentRetriever(rawRetriever, settings.getMaxReranked(), properties.getReranker());
    }

    /**
     * Active Job Retriever: vector + PostgreSQL FTS -> weighted RRF -> reranker.
     */
    @Bean("jobContentRetriever")
    public ContentRetriever jobContentRetriever(
            RagService ragService,
            RagRetrievalProperties properties,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        RagRetrievalProperties.Store settings = properties.getJob();
        validateStoreSettings("job", settings);
        validateHybridSettings(properties.getHybrid());
        ContentRetriever vectorRetriever = EmbeddingStoreContentRetriever.builder()
                .embeddingStore(ragService.getJobMarketStore())
                .embeddingModel(ragService.getEmbeddingModel())
                .maxResults(settings.getMaxCandidates())
                .minScore(settings.getMinScore())
                .build();

        ContentRetriever hybridRetriever = hybridRetriever(
                vectorRetriever,
                jdbcTemplate,
                objectMapper,
                jobVectorTable,
                "database_job",
                settings.getMaxCandidates(),
                properties.getHybrid());
        return new RerankContentRetriever(
                hybridRetriever, settings.getMaxReranked(), properties.getReranker());
    }

    /** Historical Retriever: job CLOSED/hết hạn, chỉ dùng cho phân tích thị trường. */
    @Bean("historicalJobContentRetriever")
    public ContentRetriever historicalJobContentRetriever(
            RagService ragService,
            RagRetrievalProperties properties,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper) {
        RagRetrievalProperties.Store settings = properties.getHistorical();
        validateStoreSettings("historical", settings);
        validateHybridSettings(properties.getHybrid());
        ContentRetriever vectorRetriever = EmbeddingStoreContentRetriever.builder()
                .embeddingStore(ragService.getHistoricalJobStore())
                .embeddingModel(ragService.getEmbeddingModel())
                .maxResults(settings.getMaxCandidates())
                .minScore(settings.getMinScore())
                .build();

        ContentRetriever hybridRetriever = hybridRetriever(
                vectorRetriever,
                jdbcTemplate,
                objectMapper,
                historicalJobVectorTable,
                "historical_job",
                settings.getMaxCandidates(),
                properties.getHybrid());
        return new RerankContentRetriever(
                hybridRetriever, settings.getMaxReranked(), properties.getReranker());
    }

    /**
     * Context-Aware Router: phân tích câu hỏi → định tuyến sang đúng store.
     * Bean này được inject vào AiServices thay cho contentRetriever đơn.
     */
    @Bean
    public ContextAwareContentRetriever contentRetriever(
            @org.springframework.beans.factory.annotation.Qualifier("hrContentRetriever") ContentRetriever hrRetriever,
            @org.springframework.beans.factory.annotation.Qualifier("jobContentRetriever") ContentRetriever jobRetriever,
            @org.springframework.beans.factory.annotation.Qualifier("historicalJobContentRetriever") ContentRetriever historicalRetriever,
            RagRetrievalProperties properties) {
        return new ContextAwareContentRetriever(
                hrRetriever,
                jobRetriever,
                historicalRetriever,
                properties.getRouter().getScoreMargin(),
                properties.getRouter().getMergedMaxResults());
    }

    // ── AI Service ────────────────────────────────────────────────────────────

    @Bean
    public CvAiService cvAiService(ChatLanguageModel chatLanguageModel,
            ChatMemoryProvider chatMemoryProvider,
            CvAgentTools cvAgentTools,
            JobRecommendationTools jobRecommendationTools,
            ContentRetriever contentRetriever) {
        return AiServices.builder(CvAiService.class)
                .chatLanguageModel(chatLanguageModel)
                .chatMemoryProvider(chatMemoryProvider)
                .tools(cvAgentTools, jobRecommendationTools)
                .contentRetriever(contentRetriever)
                .build();
    }

    private void validateStoreSettings(String name, RagRetrievalProperties.Store settings) {
        if (settings.getMaxCandidates() < 1) {
            throw new IllegalArgumentException("rag.retrieval." + name + ".max-candidates must be positive");
        }
        if (settings.getMaxReranked() < 1 || settings.getMaxReranked() > settings.getMaxCandidates()) {
            throw new IllegalArgumentException("rag.retrieval." + name
                    + ".max-reranked must be between 1 and max-candidates");
        }
        if (settings.getMinScore() < 0 || settings.getMinScore() > 1) {
            throw new IllegalArgumentException("rag.retrieval." + name + ".min-score must be between 0 and 1");
        }
    }

    private ContentRetriever hybridRetriever(
            ContentRetriever vectorRetriever,
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            String table,
            String sourceType,
            int maxResults,
            RagRetrievalProperties.Hybrid settings) {
        ContentRetriever lexicalRetriever = new PostgresFullTextContentRetriever(
                jdbcTemplate,
                objectMapper,
                table,
                sourceType,
                settings.getLexicalMaxCandidates());
        return new HybridContentRetriever(
                vectorRetriever,
                lexicalRetriever,
                settings.isEnabled(),
                maxResults,
                settings.getRrfK(),
                settings.getVectorWeight(),
                settings.getLexicalWeight());
    }

    private void validateHybridSettings(RagRetrievalProperties.Hybrid settings) {
        if (settings.getLexicalMaxCandidates() < 1) {
            throw new IllegalArgumentException(
                    "rag.retrieval.hybrid.lexical-max-candidates must be positive");
        }
        if (settings.getRrfK() < 1) {
            throw new IllegalArgumentException("rag.retrieval.hybrid.rrf-k must be positive");
        }
        if (settings.getVectorWeight() < 0 || settings.getLexicalWeight() < 0
                || settings.getVectorWeight() + settings.getLexicalWeight() <= 0) {
            throw new IllegalArgumentException(
                    "rag.retrieval.hybrid weights must be non-negative and not both zero");
        }
    }
}
