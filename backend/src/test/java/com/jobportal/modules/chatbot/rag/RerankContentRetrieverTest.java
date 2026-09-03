package com.jobportal.modules.chatbot.rag;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.jobportal.modules.chatbot.config.RagRetrievalProperties;

import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;

class RerankContentRetrieverTest {

    @Test
    void returnsConfiguredTopNWithoutHttpCallWhenDisabled() {
        ContentRetriever vectorRetriever = query -> List.of(
                Content.from("first"), Content.from("second"), Content.from("third"));
        RagRetrievalProperties.Reranker settings = new RagRetrievalProperties.Reranker();
        settings.setEnabled(false);

        RerankContentRetriever retriever = new RerankContentRetriever(vectorRetriever, 2, settings);

        assertThat(retriever.retrieve(Query.from("query")))
                .extracting(content -> content.textSegment().text())
                .containsExactly("first", "second");
    }
}
