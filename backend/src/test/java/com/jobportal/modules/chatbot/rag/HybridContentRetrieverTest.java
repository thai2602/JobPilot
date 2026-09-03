package com.jobportal.modules.chatbot.rag;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;

class HybridContentRetrieverTest {

    @Test
    void rrfBoostsOverlapAndKeepsStableOrder() {
        Content a = content("A", "database_job", "1");
        Content b = content("B", "database_job", "2");
        Content c = content("C", "database_job", "3");
        HybridContentRetriever retriever = retriever(
                query -> List.of(a, b),
                query -> List.of(b, c),
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("Java")))
                .extracting(item -> item.textSegment().text())
                .containsExactly("B", "A", "C");
    }

    @Test
    void deduplicatesBySourceIdentityEvenWhenTextDiffers() {
        Content vectorVersion = content("old text", "database_job", "42");
        Content lexicalVersion = content("new text", "database_job", "42");
        HybridContentRetriever retriever = retriever(
                query -> List.of(vectorVersion),
                query -> List.of(lexicalVersion),
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("developer")))
                .singleElement()
                .isSameAs(vectorVersion);
    }

    @Test
    void fallsBackToNormalizedTextWhenMetadataIsMissing() {
        HybridContentRetriever retriever = retriever(
                query -> List.of(Content.from("  Java   Developer ")),
                query -> List.of(Content.from("java developer")),
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("java developer"))).hasSize(1);
    }

    @Test
    void returnsVectorResultsWhenLexicalBranchFails() {
        Content vector = content("vector", "database_job", "1");
        HybridContentRetriever retriever = retriever(
                query -> List.of(vector),
                query -> { throw new IllegalStateException("database unavailable"); },
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("query"))).containsExactly(vector);
    }

    @Test
    void returnsLexicalResultsWhenVectorBranchIsEmpty() {
        Content lexical = content("lexical", "database_job", "1");
        HybridContentRetriever retriever = retriever(
                query -> List.of(),
                query -> List.of(lexical),
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("query"))).containsExactly(lexical);
    }

    @Test
    void disabledHybridDoesNotCallLexicalBranch() {
        AtomicInteger lexicalCalls = new AtomicInteger();
        Content vector = content("vector", "database_job", "1");
        HybridContentRetriever retriever = retriever(
                query -> List.of(vector),
                query -> {
                    lexicalCalls.incrementAndGet();
                    return List.of();
                },
                false, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("query"))).containsExactly(vector);
        assertThat(lexicalCalls).hasValue(0);
    }

    @Test
    void keepsSameSourceIdFromActiveAndHistoricalStoresSeparate() {
        Content active = content("active", "database_job", "42");
        Content historical = content("historical", "historical_job", "42");
        HybridContentRetriever retriever = retriever(
                query -> List.of(active),
                query -> List.of(historical),
                true, 10, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("query"))).containsExactly(active, historical);
    }

    @Test
    void appliesLimitAfterFusionAndDeduplication() {
        Content a = content("A", "database_job", "1");
        Content b = content("B", "database_job", "2");
        Content c = content("C", "database_job", "3");
        HybridContentRetriever retriever = retriever(
                query -> List.of(a, b, c),
                query -> List.of(a, b, c),
                true, 2, 60, 1.0, 1.0);

        assertThat(retriever.retrieve(Query.from("query"))).containsExactly(a, b);
    }

    private HybridContentRetriever retriever(
            ContentRetriever vector,
            ContentRetriever lexical,
            boolean enabled,
            int maxResults,
            int rrfK,
            double vectorWeight,
            double lexicalWeight) {
        return new HybridContentRetriever(
                vector, lexical, enabled, maxResults, rrfK, vectorWeight, lexicalWeight);
    }

    private Content content(String text, String sourceType, String sourceId) {
        return Content.from(TextSegment.from(text, new Metadata(Map.of(
                "source_type", sourceType,
                "source_id", sourceId))));
    }
}
