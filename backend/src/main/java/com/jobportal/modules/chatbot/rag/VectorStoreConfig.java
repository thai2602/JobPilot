package com.jobportal.modules.chatbot.rag;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.pgvector.PgVectorEmbeddingStore;
import lombok.extern.slf4j.Slf4j;

/** Các vector store PostgreSQL độc lập cho HR, job active và job lịch sử. */
@Slf4j
@Configuration
public class VectorStoreConfig {

    @Value("${rag.pgvector.host:localhost}")
    private String host;

    @Value("${rag.pgvector.port:5432}")
    private int port;

    @Value("${rag.pgvector.database:jobpilot}")
    private String database;

    @Value("${rag.pgvector.username:postgres}")
    private String username;

    @Value("${rag.pgvector.password:123456}")
    private String password;

    @Value("${langchain.dimension:1536}")
    private int dimension;

    @Value("${rag.pgvector.hr-table:rag_hr_embeddings}")
    private String hrTable;

    @Value("${rag.pgvector.job-table:rag_job_embeddings}")
    private String jobTable;

    @Value("${rag.pgvector.historical-job-table:rag_historical_job_embeddings}")
    private String historicalJobTable;

    @Bean("hrKnowledgeStore")
    public EmbeddingStore<TextSegment> hrKnowledgeStore() {
        return createStore(hrTable, "HR Store");
    }

    @Bean("jobMarketStore")
    public EmbeddingStore<TextSegment> jobMarketStore() {
        return createStore(jobTable, "Job Store");
    }

    @Bean("historicalJobStore")
    public EmbeddingStore<TextSegment> historicalJobStore() {
        return createStore(historicalJobTable, "Historical Job Store");
    }

    private PgVectorEmbeddingStore createStore(String table, String label) {
        validateIdentifier(table);
        log.info("[{}] Connecting to pgvector table {} ({} dimensions)", label, table, dimension);
        return PgVectorEmbeddingStore.builder()
                .host(host)
                .port(port)
                .user(username)
                .password(password)
                .database(database)
                .table(table)
                .dimension(dimension)
                .createTable(true)
                .dropTableFirst(false)
                // Exact cosine search avoids recall loss while the current corpus is still small.
                .useIndex(false)
                .build();
    }

    private void validateIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid pgvector table name: " + identifier);
        }
    }
}
