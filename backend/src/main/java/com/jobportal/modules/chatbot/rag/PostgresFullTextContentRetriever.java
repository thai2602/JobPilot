package com.jobportal.modules.chatbot.rag;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import org.springframework.jdbc.core.JdbcTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.data.document.Metadata;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.rag.content.Content;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.query.Query;
import lombok.extern.slf4j.Slf4j;

/**
 * BM25 lexical retriever for a synchronized job embedding table.
 *
 * <p>{@code pg_search} is the primary engine. The native PostgreSQL
 * {@code TSVECTOR}/GIN query from V10 remains a compatibility fallback so the
 * hybrid pipeline can still use lexical candidates during a pg_search issue.</p>
 */
@Slf4j
public class PostgresFullTextContentRetriever implements ContentRetriever {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final String table;
    private final String sourceType;
    private final int maxResults;
    private final String bm25SearchSql;
    private final String nativeFtsSearchSql;

    public PostgresFullTextContentRetriever(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            String table,
            String sourceType,
            int maxResults) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.table = requireIdentifier(table);
        this.sourceType = requireText("sourceType", sourceType);
        if (maxResults < 1) {
            throw new IllegalArgumentException("maxResults must be positive");
        }
        this.maxResults = maxResults;
        this.bm25SearchSql = buildBm25SearchSql(this.table);
        this.nativeFtsSearchSql = buildNativeFtsSearchSql(this.table);
    }

    @Override
    public List<Content> retrieve(Query query) {
        String queryText = query == null ? null : query.text();
        if (queryText == null || queryText.isBlank()) {
            return List.of();
        }

        String normalizedQuery = queryText.strip();
        try {
            List<Content> results = jdbcTemplate.query(
                    bm25SearchSql,
                    (resultSet, rowNumber) -> mapContent(resultSet, "pg_search_bm25"),
                    sourceType,
                    normalizedQuery,
                    normalizedQuery,
                    normalizedQuery,
                    maxResults);
            log.debug("[pg_search BM25] table={}, sourceType={}, results={}",
                    table, sourceType, results.size());
            return List.copyOf(results);
        } catch (RuntimeException bm25Exception) {
            log.warn("[pg_search BM25] Query failed for table {} ({}). Falling back to native PostgreSQL FTS.",
                    table, bm25Exception.getMessage());
            return retrieveWithNativeFts(normalizedQuery);
        }
    }

    private List<Content> retrieveWithNativeFts(String queryText) {
        try {
            List<Content> results = jdbcTemplate.query(
                    nativeFtsSearchSql,
                    (resultSet, rowNumber) -> mapContent(resultSet, "postgres_fts_fallback"),
                    queryText, sourceType, maxResults);
            log.debug("[PostgreSQL FTS fallback] table={}, sourceType={}, results={}",
                    table, sourceType, results.size());
            return List.copyOf(results);
        } catch (RuntimeException fallbackException) {
            // Hybrid retrieval must remain available through its vector branch.
            log.warn("[PostgreSQL FTS fallback] Query failed for table {} ({}). Returning no lexical candidates.",
                    table, fallbackException.getMessage());
            return List.of();
        }
    }

    private Content mapContent(ResultSet resultSet, String retrievalChannel) throws SQLException {
        String text = resultSet.getString("text");
        Map<String, Object> metadataValues = parseMetadata(resultSet.getString("metadata_json"));

        String rowSourceType = resultSet.getString("source_type");
        String rowSourceId = resultSet.getString("source_id");
        metadataValues.put("source_type", rowSourceType == null || rowSourceType.isBlank()
                ? sourceType : rowSourceType);
        if (rowSourceId != null && !rowSourceId.isBlank()) {
            metadataValues.put("source_id", rowSourceId);
        }
        metadataValues.put("retrieval_channel", retrievalChannel);
        metadataValues.put("lexical_score", resultSet.getDouble("lexical_score"));

        return Content.from(TextSegment.from(text == null ? "" : text, new Metadata(metadataValues)));
    }

    private Map<String, Object> parseMetadata(String metadataJson) {
        Map<String, Object> values = new LinkedHashMap<>();
        if (metadataJson == null || metadataJson.isBlank()) {
            return values;
        }

        try {
            JsonNode root = objectMapper.readTree(metadataJson);
            if (root == null || !root.isObject()) {
                return values;
            }
            Iterator<Entry<String, JsonNode>> fields = root.fields();
            while (fields.hasNext()) {
                Entry<String, JsonNode> field = fields.next();
                Object value = metadataValue(field.getValue());
                if (value != null) {
                    values.put(field.getKey(), value);
                }
            }
        } catch (Exception exception) {
            log.debug("[Job lexical retrieval] Ignoring malformed metadata JSON: {}", exception.getMessage());
        }
        return values;
    }

    /** LangChain4j 0.29 Metadata accepts strings and numeric scalar values only. */
    private Object metadataValue(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (value.isTextual()) {
            return value.textValue();
        }
        if (value.isIntegralNumber()) {
            long number = value.longValue();
            return number >= Integer.MIN_VALUE && number <= Integer.MAX_VALUE ? (int) number : number;
        }
        if (value.isFloatingPointNumber()) {
            return value.doubleValue();
        }
        // Boolean, array and object are stringified because 0.29 Metadata rejects them.
        return value.isBoolean() ? Boolean.toString(value.booleanValue()) : value.toString();
    }

    private String buildBm25SearchSql(String validatedTable) {
        return """
                SELECT e.text,
                       e.metadata::text AS metadata_json,
                       e.source_type,
                       e.source_id,
                       pdb.score(e.embedding_id) AS lexical_score
                FROM public.%s e
                WHERE e.source_type = ?
                  AND (
                      e.bm25_title ||| ((?::TEXT)::pdb.boost(3.0))
                      OR e.bm25_company ||| ((?::TEXT)::pdb.boost(1.4))
                      OR e.text ||| (?::TEXT)
                  )
                ORDER BY lexical_score DESC,
                         e.embedding_id ASC
                LIMIT ?
                """.formatted(validatedTable);
    }

    private String buildNativeFtsSearchSql(String validatedTable) {
        return """
                WITH search_query AS (
                    SELECT websearch_to_tsquery('simple', public.jobpilot_unaccent(?)) AS query
                )
                SELECT e.text,
                       e.metadata::text AS metadata_json,
                       e.source_type,
                       e.source_id,
                       ts_rank_cd(e.search_vector, search_query.query, 32) AS lexical_score
                FROM public.%s e
                CROSS JOIN search_query
                WHERE e.source_type = ?
                  AND e.search_vector @@ search_query.query
                ORDER BY lexical_score DESC,
                         e.indexed_at DESC NULLS LAST,
                         e.source_id ASC
                LIMIT ?
                """.formatted(validatedTable);
    }

    private String requireIdentifier(String value) {
        if (value == null || !value.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid PostgreSQL lexical-search table name: " + value);
        }
        return value;
    }

    private String requireText(String name, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value.strip();
    }
}
