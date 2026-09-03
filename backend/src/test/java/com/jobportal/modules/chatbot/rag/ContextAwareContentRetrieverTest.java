package com.jobportal.modules.chatbot.rag;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;

class ContextAwareContentRetrieverTest {

    @Test
    void routesStrongHrQueryOnlyToHrStore() {
        AtomicInteger hrCalls = new AtomicInteger();
        AtomicInteger jobCalls = new AtomicInteger();
        ContentRetriever hr = query -> {
            hrCalls.incrementAndGet();
            return List.of(content("ATS rules", "hr", "1"));
        };
        ContentRetriever job = query -> {
            jobCalls.incrementAndGet();
            return List.of(content("Frontend job", "job", "1"));
        };

        ContextAwareContentRetriever router = new ContextAwareContentRetriever(hr, job, 1, 10);
        ContextAwareContentRetriever.RetrievalResult result = router.retrieveWithTrace(
                Query.from("Hãy đánh giá CV và kiểm tra tiêu chí ATS cho tôi"));

        assertThat(result.trace().route()).isEqualTo(ContextAwareContentRetriever.Route.HR);
        assertThat(result.trace().hrSignalScore()).isGreaterThan(result.trace().jobSignalScore());
        assertThat(hrCalls).hasValue(1);
        assertThat(jobCalls).hasValue(0);
        assertThat(result.contents()).extracting(content -> content.textSegment().text())
                .containsExactly("ATS rules");
    }

    @Test
    void mergesBothStoresFairlyDeduplicatesAndCapsContext() {
        Content duplicateHr = content("Same semantic document", "shared", "42");
        Content duplicateJob = content("Duplicate with different text", "shared", "42");
        ContentRetriever hr = query -> List.of(
                duplicateHr,
                content("HR second", "hr", "2"),
                content("HR third", "hr", "3"));
        ContentRetriever job = query -> List.of(
                duplicateJob,
                content("Job second", "job", "2"),
                content("Job third", "job", "3"));

        ContextAwareContentRetriever router = new ContextAwareContentRetriever(hr, job, 1, 4);
        ContextAwareContentRetriever.RetrievalResult result = router.retrieveWithTrace(
                Query.from("So sánh CV với job phù hợp"));

        assertThat(result.trace().route()).isEqualTo(ContextAwareContentRetriever.Route.BOTH);
        assertThat(result.trace().duplicatesRemoved()).isEqualTo(1);
        assertThat(result.trace().returnedResults()).isEqualTo(4);
        assertThat(result.contents()).extracting(content -> content.textSegment().text())
                .containsExactly("Same semantic document", "HR second", "Job second", "HR third");
    }

    @Test
    void removesLargeCvJsonBeforeRetrieval() {
        AtomicReference<String> retrievedQuery = new AtomicReference<>();
        ContentRetriever capture = query -> {
            retrievedQuery.set(query.text());
            return List.of(content("context", "hr", "1"));
        };
        ContextAwareContentRetriever router = new ContextAwareContentRetriever(capture, query -> List.of(), 1, 10);

        router.retrieve(Query.from("Dựa trên dữ liệu sau (JSON): {\"name\":\"A\",\"skills\":[\"Java\"]} hãy đánh giá CV"));

        assertThat(retrievedQuery.get()).doesNotContain("{", "skills", "Java");
        assertThat(retrievedQuery.get()).contains("hãy đánh giá CV");
    }

    @Test
    void routesClosedJobQuestionOnlyToHistoricalStore() {
        AtomicInteger activeCalls = new AtomicInteger();
        AtomicInteger historicalCalls = new AtomicInteger();
        ContentRetriever active = query -> {
            activeCalls.incrementAndGet();
            return List.of(content("Active job", "database_job", "1"));
        };
        ContentRetriever historical = query -> {
            historicalCalls.incrementAndGet();
            return List.of(content("Closed job", "historical_job", "2"));
        };

        ContextAwareContentRetriever router = new ContextAwareContentRetriever(
                query -> List.of(), active, historical, 1, 10);
        ContextAwareContentRetriever.RetrievalResult result = router.retrieveWithTrace(
                Query.from("Phân tích các công việc đã đóng và hết hạn"));

        assertThat(result.trace().route()).isEqualTo(ContextAwareContentRetriever.Route.HISTORICAL);
        assertThat(result.trace().historicalSignalScore()).isPositive();
        assertThat(activeCalls).hasValue(0);
        assertThat(historicalCalls).hasValue(1);
        assertThat(result.contents()).extracting(content -> content.textSegment().text())
                .containsExactly("Closed job");
    }

    @Test
    void comparesActiveAndHistoricalMarketDataTogether() {
        ContentRetriever active = query -> List.of(content("Current salary", "database_job", "1"));
        ContentRetriever historical = query -> List.of(content("Past salary", "historical_job", "1"));
        ContextAwareContentRetriever router = new ContextAwareContentRetriever(
                query -> List.of(), active, historical, 1, 10);

        ContextAwareContentRetriever.RetrievalResult result = router.retrieveWithTrace(
                Query.from("So sánh xu hướng mức lương việc làm hiện tại và trước đây"));

        assertThat(result.trace().route()).isEqualTo(ContextAwareContentRetriever.Route.JOB_HISTORY);
        assertThat(result.contents()).extracting(content -> content.textSegment().text())
                .containsExactly("Current salary", "Past salary");
    }

    @Test
    void javaTopicFilterKeepsHybridJobMatches() {
        ContentRetriever hr = query -> List.of(content("Unrelated HR chunk", "hr", "1"));
        ContentRetriever active = query -> List.of(content("Senior Java Developer", "database_job", "42"));
        ContextAwareContentRetriever router = new ContextAwareContentRetriever(hr, active, 1, 10);

        ContextAwareContentRetriever.RetrievalResult result = router.retrieveWithTrace(Query.from("Java"));

        assertThat(result.contents()).extracting(item -> item.textSegment().text())
                .containsExactly("Senior Java Developer");
        assertThat(result.trace().metadataFiltered()).isTrue();
    }

    private Content content(String text, String sourceType, String sourceId) {
        Metadata metadata = new Metadata();
        metadata.put("source_type", sourceType);
        metadata.put("source_id", sourceId);
        return Content.from(TextSegment.from(text, metadata));
    }
}
