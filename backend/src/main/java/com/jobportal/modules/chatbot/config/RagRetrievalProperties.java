package com.jobportal.modules.chatbot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Getter;
import lombok.Setter;

/** Cấu hình tập trung cho routing, hybrid retrieval và reranking. */
@Getter
@Setter
@ConfigurationProperties(prefix = "rag.retrieval")
public class RagRetrievalProperties {

    private Store hr = new Store(24, 0.60, 8);
    private Store job = new Store(18, 0.55, 6);
    private Store historical = new Store(24, 0.50, 8);
    private Hybrid hybrid = new Hybrid();
    private Router router = new Router();
    private Reranker reranker = new Reranker();

    @Getter
    @Setter
    public static class Store {
        private int maxCandidates;
        private double minScore;
        private int maxReranked;

        public Store() {
        }

        public Store(int maxCandidates, double minScore, int maxReranked) {
            this.maxCandidates = maxCandidates;
            this.minScore = minScore;
            this.maxReranked = maxReranked;
        }
    }

    @Getter
    @Setter
    public static class Hybrid {
        private boolean enabled = true;
        private int lexicalMaxCandidates = 24;
        private int rrfK = 60;
        private double vectorWeight = 1.0;
        private double lexicalWeight = 1.2;
    }

    @Getter
    @Setter
    public static class Router {
        private int scoreMargin = 1;
        private int mergedMaxResults = 10;
    }

    @Getter
    @Setter
    public static class Reranker {
        private boolean enabled = true;
        private String url = "http://localhost:8000/rerank";
        private int connectTimeoutMs = 1500;
        private int readTimeoutMs = 2500;
    }
}
