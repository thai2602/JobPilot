package com.jobportal.modules.chatbot.rag;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import lombok.extern.slf4j.Slf4j;

/** Combines semantic-vector and PostgreSQL lexical ranks using weighted RRF. */
@Slf4j
public class HybridContentRetriever implements ContentRetriever {

    private final ContentRetriever vectorRetriever;
    private final ContentRetriever lexicalRetriever;
    private final boolean enabled;
    private final int maxResults;
    private final int rrfK;
    private final double vectorWeight;
    private final double lexicalWeight;

    public HybridContentRetriever(
            ContentRetriever vectorRetriever,
            ContentRetriever lexicalRetriever,
            boolean enabled,
            int maxResults,
            int rrfK,
            double vectorWeight,
            double lexicalWeight) {
        this.vectorRetriever = requireRetriever("vectorRetriever", vectorRetriever);
        this.lexicalRetriever = requireRetriever("lexicalRetriever", lexicalRetriever);
        this.enabled = enabled;
        if (maxResults < 1) {
            throw new IllegalArgumentException("maxResults must be positive");
        }
        if (rrfK < 1) {
            throw new IllegalArgumentException("rrfK must be positive");
        }
        if (vectorWeight < 0 || lexicalWeight < 0 || vectorWeight + lexicalWeight <= 0) {
            throw new IllegalArgumentException("RRF weights must be non-negative and not both zero");
        }
        this.maxResults = maxResults;
        this.rrfK = rrfK;
        this.vectorWeight = vectorWeight;
        this.lexicalWeight = lexicalWeight;
    }

    @Override
    public List<Content> retrieve(Query query) {
        if (query == null || query.text() == null || query.text().isBlank()) {
            return List.of();
        }

        List<Content> vectorResults = safeRetrieve("vector", vectorRetriever, query);
        if (!enabled) {
            return deduplicateAndLimit(vectorResults);
        }

        List<Content> lexicalResults = safeRetrieve("lexical", lexicalRetriever, query);
        List<Content> fused = reciprocalRankFusion(vectorResults, lexicalResults);
        log.debug("[Hybrid Search] vector={}, lexical={}, fused={}, rrfK={}, weights={}/{}",
                vectorResults.size(), lexicalResults.size(), fused.size(),
                rrfK, vectorWeight, lexicalWeight);
        return fused;
    }

    private List<Content> reciprocalRankFusion(
            List<Content> vectorResults,
            List<Content> lexicalResults) {
        Map<String, FusedCandidate> candidates = new LinkedHashMap<>();
        int[] sequence = {0};
        addRanking(candidates, vectorResults, vectorWeight, sequence);
        addRanking(candidates, lexicalResults, lexicalWeight, sequence);

        return candidates.values().stream()
                .sorted(Comparator.comparingDouble(FusedCandidate::score).reversed()
                        .thenComparingInt(FusedCandidate::firstSeen))
                .limit(maxResults)
                .map(FusedCandidate::content)
                .toList();
    }

    private void addRanking(
            Map<String, FusedCandidate> candidates,
            List<Content> ranking,
            double weight,
            int[] sequence) {
        Set<String> seenInRanking = new HashSet<>();
        for (int index = 0; index < ranking.size(); index++) {
            Content content = ranking.get(index);
            if (content == null) {
                continue;
            }
            String key = contentKey(content);
            if (!seenInRanking.add(key)) {
                continue;
            }

            double contribution = weight / (rrfK + index + 1.0);
            FusedCandidate existing = candidates.get(key);
            if (existing == null) {
                candidates.put(key, new FusedCandidate(content, contribution, sequence[0]++));
            } else {
                candidates.put(key, existing.withAdditionalScore(contribution));
            }
        }
    }

    private List<Content> safeRetrieve(String channel, ContentRetriever retriever, Query query) {
        try {
            List<Content> contents = retriever.retrieve(query);
            return contents == null ? List.of() : contents;
        } catch (RuntimeException exception) {
            log.warn("[Hybrid Search] {} branch failed ({}); using the remaining branch.",
                    channel, exception.getMessage());
            return List.of();
        }
    }

    private List<Content> deduplicateAndLimit(List<Content> contents) {
        Map<String, Content> unique = new LinkedHashMap<>();
        for (Content content : contents) {
            if (content != null) {
                unique.putIfAbsent(contentKey(content), content);
            }
        }
        return new ArrayList<>(unique.values()).stream().limit(maxResults).toList();
    }

    private String contentKey(Content content) {
        if (content.textSegment() == null) {
            return "content:" + content.hashCode();
        }
        String sourceType = null;
        String sourceId = null;
        if (content.textSegment().metadata() != null) {
            sourceType = content.textSegment().metadata().getString("source_type");
            sourceId = content.textSegment().metadata().getString("source_id");
        }
        if (sourceId != null && !sourceId.isBlank()) {
            return "source:" + String.valueOf(sourceType) + ':' + sourceId;
        }

        String text = content.textSegment().text();
        if (text == null) {
            return "segment:" + content.hashCode();
        }
        return "text:" + text.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private ContentRetriever requireRetriever(String name, ContentRetriever value) {
        if (value == null) {
            throw new IllegalArgumentException(name + " must not be null");
        }
        return value;
    }

    private record FusedCandidate(Content content, double score, int firstSeen) {
        private FusedCandidate withAdditionalScore(double additionalScore) {
            return new FusedCandidate(content, score + additionalScore, firstSeen);
        }
    }
}
