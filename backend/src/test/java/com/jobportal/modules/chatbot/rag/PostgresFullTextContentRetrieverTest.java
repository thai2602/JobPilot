package com.jobportal.modules.chatbot.rag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.sql.ResultSet;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.query.Query;

class PostgresFullTextContentRetrieverTest {

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void usesPgSearchBm25AndMapsTextMetadataAndSourceIdentity() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getString("text")).thenReturn("Title: Java Developer");
        when(resultSet.getString("metadata_json"))
                .thenReturn("{\"title\":\"Java Developer\",\"canonical_id\":42,\"featured\":true}");
        when(resultSet.getString("source_type")).thenReturn("database_job");
        when(resultSet.getString("source_id")).thenReturn("42");
        when(resultSet.getDouble("lexical_score")).thenReturn(0.75);

        doAnswer(invocation -> {
            RowMapper<Content> mapper = invocation.getArgument(1);
            return List.of(mapper.mapRow(resultSet, 0));
        }).when(jdbcTemplate).query(
                anyString(), any(RowMapper.class), any(), any(), any(), any(), any());

        PostgresFullTextContentRetriever retriever = new PostgresFullTextContentRetriever(
                jdbcTemplate, new ObjectMapper(), "rag_job_embeddings", "database_job", 12);

        Content result = retriever.retrieve(Query.from("Java Developer")).getFirst();
        assertThat(result.textSegment().text()).isEqualTo("Title: Java Developer");
        assertThat(result.textSegment().metadata().getString("source_type")).isEqualTo("database_job");
        assertThat(result.textSegment().metadata().getString("source_id")).isEqualTo("42");
        assertThat(result.textSegment().metadata().getString("featured")).isEqualTo("true");
        assertThat(result.textSegment().metadata().getDouble("lexical_score")).isEqualTo(0.75);
        assertThat(result.textSegment().metadata().getString("retrieval_channel"))
                .isEqualTo("pg_search_bm25");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(
                sqlCaptor.capture(), any(RowMapper.class), any(), any(), any(), any(), any());
        assertThat(sqlCaptor.getValue())
                .contains("pdb.score(e.embedding_id)")
                .contains("e.bm25_title |||")
                .contains("e.bm25_company |||")
                .contains("e.text |||")
                .doesNotContain("ts_rank_cd");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void nullAndBlankQueriesSkipPostgres() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        PostgresFullTextContentRetriever retriever = new PostgresFullTextContentRetriever(
                jdbcTemplate, new ObjectMapper(), "rag_job_embeddings", "database_job", 12);
        Query blankQuery = mock(Query.class);
        when(blankQuery.text()).thenReturn("   ");

        assertThat(retriever.retrieve(null)).isEmpty();
        assertThat(retriever.retrieve(blankQuery)).isEmpty();
        verifyNoInteractions(jdbcTemplate);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void fallsBackToNativePostgresFtsWhenPgSearchFails() throws Exception {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ResultSet resultSet = mock(ResultSet.class);
        when(resultSet.getString("text")).thenReturn("Title: Java Developer");
        when(resultSet.getString("metadata_json")).thenReturn("{\"title\":\"Java Developer\"}");
        when(resultSet.getString("source_type")).thenReturn("database_job");
        when(resultSet.getString("source_id")).thenReturn("42");
        when(resultSet.getDouble("lexical_score")).thenReturn(0.5);

        doThrow(new IllegalStateException("pg_search unavailable"))
                .when(jdbcTemplate).query(
                        anyString(), any(RowMapper.class), any(), any(), any(), any(), any());
        doAnswer(invocation -> {
            RowMapper<Content> mapper = invocation.getArgument(1);
            return List.of(mapper.mapRow(resultSet, 0));
        }).when(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), any());

        PostgresFullTextContentRetriever retriever = new PostgresFullTextContentRetriever(
                jdbcTemplate, new ObjectMapper(), "rag_job_embeddings", "database_job", 12);

        Content result = retriever.retrieve(Query.from("Java")).getFirst();
        assertThat(result.textSegment().metadata().getString("retrieval_channel"))
                .isEqualTo("postgres_fts_fallback");

        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).query(
                sqlCaptor.capture(), any(RowMapper.class), any(), any(), any());
        assertThat(sqlCaptor.getValue())
                .contains("ts_rank_cd")
                .contains("search_vector @@ search_query.query");
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    @Test
    void bothLexicalEnginesFailReturnsNoCandidates() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        doThrow(new IllegalStateException("pg_search unavailable"))
                .when(jdbcTemplate).query(
                        anyString(), any(RowMapper.class), any(), any(), any(), any(), any());
        doThrow(new IllegalStateException("native FTS unavailable"))
                .when(jdbcTemplate).query(anyString(), any(RowMapper.class), any(), any(), any());
        PostgresFullTextContentRetriever retriever = new PostgresFullTextContentRetriever(
                jdbcTemplate, new ObjectMapper(), "rag_job_embeddings", "database_job", 12);

        assertThat(retriever.retrieve(Query.from("Java"))).isEmpty();
    }

    @Test
    void rejectsUnsafeTableIdentifier() {
        assertThatThrownBy(() -> new PostgresFullTextContentRetriever(
                mock(JdbcTemplate.class), new ObjectMapper(),
                "rag_job_embeddings; DROP TABLE jobs", "database_job", 12))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid PostgreSQL lexical-search table name");
    }
}
