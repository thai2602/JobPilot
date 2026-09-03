package com.jobportal.modules.chatbot.rag;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Incrementally synchronizes active jobs from the canonical public.jobs table
 * into the job-market pgvector store. Company information is joined into each
 * job document; raw crawler tables and project files are never read here.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class IncrementalRagSyncService {

    static final String JOB_SOURCE_TYPE = "database_job";
    static final String JOB_INDEX_VERSION = "v1";

    private final JdbcTemplate jdbcTemplate;
    private final EmbeddingModel embeddingModel;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${rag.incremental.enabled:false}")
    private boolean enabled;

    @Value("${rag.incremental.run-on-start:false}")
    private boolean runOnStart;

    @Value("${rag.incremental.batch-size:64}")
    private int batchSize;

    @Value("${rag.incremental.delete-stale:true}")
    private boolean deleteStale;

    @Value("${rag.incremental.allow-empty-source:false}")
    private boolean allowEmptySource;

    @Value("${rag.incremental.source-schema:public}")
    private String sourceSchema;

    @Value("${rag.incremental.job-table:jobs}")
    private String jobTable;

    @Value("${rag.incremental.company-table:companies}")
    private String companyTable;

    @Value("${rag.pgvector.job-table:rag_job_embeddings}")
    private String vectorTable;

    @Order(100)
    @EventListener(ApplicationReadyEvent.class)
    public void synchronizeOnStartup() {
        if (!enabled || !runOnStart) {
            return;
        }
        try {
            synchronize();
        } catch (RuntimeException exception) {
            log.error("[Incremental RAG] Startup synchronization failed", exception);
        }
    }

    /** Public entry point for tests, admin jobs, or future event-driven triggers. */
    public SyncResult synchronize() {
        validateConfiguration();
        if (!running.compareAndSet(false, true)) {
            return SyncResult.skippedBecauseRunning();
        }

        Long runId = jdbcTemplate.queryForObject("""
                INSERT INTO rag_sync_runs (status)
                VALUES ('RUNNING')
                RETURNING id
                """, Long.class);

        try {
            SourceLoadResult jobSource = loadJobs();
            List<SourceDocument> sourceDocuments = jobSource.documents();

            boolean rebuilt = prepareDatabaseJobStore(jobSource);
            Map<SourceKey, String> indexedHashes = rebuilt ? Map.of() : loadIndexedHashes();
            List<SourceDocument> changed = new ArrayList<>();
            int added = 0;
            int updated = 0;
            int unchanged = 0;

            for (SourceDocument document : sourceDocuments) {
                String indexedHash = indexedHashes.get(document.key());
                if (document.contentHash().equals(indexedHash)) {
                    unchanged++;
                } else {
                    changed.add(document);
                    if (indexedHash == null) {
                        added++;
                    } else {
                        updated++;
                    }
                }
            }

            embedAndUpsert(changed);
            int deleted = deleteStaleVectors(indexedHashes.keySet(), sourceDocuments,
                    jobSource.tableAvailable());

            SyncResult result = new SyncResult(runId == null ? -1 : runId, added, updated, unchanged, deleted, false);
            markJobStoreReady();
            markRunCompleted(result);
            log.info("[Incremental RAG] Completed: added={}, updated={}, unchanged={}, deleted={}",
                    added, updated, unchanged, deleted);
            return result;
        } catch (RuntimeException exception) {
            markRunFailed(runId, exception);
            throw exception;
        } finally {
            running.set(false);
        }
    }

    public boolean isEnabled() {
        return enabled;
    }

    /**
     * Chuyển Job Store từ file/legacy vectors sang public.jobs đúng một lần.
     * Chỉ xóa sau khi đã đọc được nguồn DB và xác nhận nguồn không rỗng, trừ khi
     * allow-empty-source được bật rõ ràng.
     */
    private boolean prepareDatabaseJobStore(SourceLoadResult jobSource) {
        if (!jobSource.tableAvailable()) {
            throw new IllegalStateException("Cannot rebuild Job Store because public.jobs is unavailable");
        }
        if (jobSource.documents().isEmpty() && !allowEmptySource) {
            throw new IllegalStateException("Refusing to clear Job Store because public.jobs has no active jobs");
        }

        String desiredSource = databaseIndexSource();
        String currentSource = jdbcTemplate.query(
                "SELECT source FROM rag_index_state WHERE store_name = 'job' AND status = 'READY'",
                resultSet -> resultSet.next() ? resultSet.getString(1) : null);
        if (desiredSource.equals(currentSource)) {
            return false;
        }

        validateIdentifier(vectorTable);
        Integer deletedRows = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + vectorTable, Integer.class);
        jdbcTemplate.execute("DELETE FROM " + vectorTable);
        jdbcTemplate.update("""
                INSERT INTO rag_index_state (store_name, status, row_count, source, updated_at)
                VALUES ('job', 'IMPORTING', 0, ?, NOW())
                ON CONFLICT (store_name) DO UPDATE SET
                    status = 'IMPORTING', row_count = 0, source = EXCLUDED.source, updated_at = NOW()
                """, desiredSource);
        log.info("[Incremental RAG] Cleared {} old Job Store vectors; rebuilding exclusively from {}.{}",
                deletedRows == null ? 0 : deletedRows, sourceSchema, jobTable);
        return true;
    }

    private void markJobStoreReady() {
        validateIdentifier(vectorTable);
        Long rowCount = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + vectorTable + " WHERE source_type = ?",
                Long.class, JOB_SOURCE_TYPE);
        jdbcTemplate.update("""
                INSERT INTO rag_index_state (store_name, status, row_count, source, updated_at)
                VALUES ('job', 'READY', ?, ?, NOW())
                ON CONFLICT (store_name) DO UPDATE SET
                    status = 'READY', row_count = EXCLUDED.row_count,
                    source = EXCLUDED.source, updated_at = NOW()
                """, rowCount == null ? 0 : rowCount, databaseIndexSource());
    }

    private String databaseIndexSource() {
        return "database:" + sourceSchema + "." + jobTable + ":" + JOB_INDEX_VERSION;
    }

    private SourceLoadResult loadJobs() {
        if (!tableExists(sourceSchema, jobTable) || !tableExists(sourceSchema, companyTable)) {
            log.warn("[Incremental RAG] Database source tables are incomplete; job sync skipped");
            return SourceLoadResult.unavailable();
        }

        String sql = """
                SELECT j.id AS canonical_id, j.source, j.external_id, j.slug, j.title,
                       j.industry, c.name AS company, j.salary_raw,
                       j.salary_min, j.salary_max, j.currency,
                       COALESCE(j.location_raw, j.location_city) AS location,
                       j.experience_years, j.job_level, j.job_type, j.quantity,
                       j.expired_at, j.skills::text, j.description,
                       j.requirements, j.benefits, j.source_url,
                       j.crawled_at_utc, j.status
                FROM %s.%s j
                LEFT JOIN %s.%s c ON c.id = j.company_id
                WHERE j.is_deleted IS NOT TRUE
                  AND UPPER(COALESCE(j.status, 'PUBLISHED')) IN ('PUBLISHED', 'ACTIVE', 'OPEN')
                  AND (j.expired_at IS NULL OR j.expired_at >= CURRENT_TIMESTAMP)
                """.formatted(sourceSchema, jobTable, sourceSchema, companyTable);

        List<SourceDocument> documents = jdbcTemplate.query(sql, (resultSet, rowNumber) -> {
            String sourceId = Long.toString(resultSet.getLong("canonical_id"));
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("source_type", JOB_SOURCE_TYPE);
            metadata.put("source_id", sourceId);
            metadata.put("canonical_id", resultSet.getLong("canonical_id"));
            metadata.put("slug", resultSet.getString("slug"));
            metadata.put("external_id", resultSet.getString("external_id"));
            metadata.put("title", resultSet.getString("title"));
            metadata.put("company", resultSet.getString("company"));
            metadata.put("location", resultSet.getString("location"));
            metadata.put("url", resultSet.getString("source_url"));
            metadata.put("source", resultSet.getString("source"));
            metadata.put("crawled_at_utc", toString(resultSet.getObject("crawled_at_utc")));

            String text = structuredText("JOB",
                    field("Title", resultSet.getString("title")),
                    field("Industry", resultSet.getString("industry")),
                    field("Company", resultSet.getString("company")),
                    field("Salary", resultSet.getString("salary_raw")),
                    field("Salary minimum", toString(resultSet.getObject("salary_min"))),
                    field("Salary maximum", toString(resultSet.getObject("salary_max"))),
                    field("Currency", resultSet.getString("currency")),
                    field("Location", resultSet.getString("location")),
                    field("Experience", resultSet.getString("experience_years")),
                    field("Level", resultSet.getString("job_level")),
                    field("Employment type", resultSet.getString("job_type")),
                    field("Quantity", toString(resultSet.getObject("quantity"))),
                    field("Deadline", toString(resultSet.getObject("expired_at"))),
                    field("Status", resultSet.getString("status")),
                    field("Skills", resultSet.getString("skills")),
                    field("Description", resultSet.getString("description")),
                    field("Requirements", resultSet.getString("requirements")),
                    field("Benefits", resultSet.getString("benefits")));

            return sourceDocument(JOB_SOURCE_TYPE, sourceId, text, metadata);
        });
        return new SourceLoadResult(documents, true);
    }

    private Map<SourceKey, String> loadIndexedHashes() {
        validateIdentifier(vectorTable);
        Map<SourceKey, String> hashes = new HashMap<>();
        jdbcTemplate.query("SELECT source_type, source_id, content_hash FROM " + vectorTable
                        + " WHERE source_type = ?",
                (org.springframework.jdbc.core.RowCallbackHandler) resultSet -> hashes.put(
                        new SourceKey(resultSet.getString("source_type"), resultSet.getString("source_id")),
                        resultSet.getString("content_hash")),
                JOB_SOURCE_TYPE);
        return hashes;
    }

    private void embedAndUpsert(List<SourceDocument> changed) {
        if (changed.isEmpty()) {
            return;
        }
        int safeBatchSize = Math.max(1, Math.min(batchSize, 500));
        for (int start = 0; start < changed.size(); start += safeBatchSize) {
            List<SourceDocument> batch = changed.subList(start, Math.min(start + safeBatchSize, changed.size()));
            List<TextSegment> segments = batch.stream()
                    .map(document -> TextSegment.from(document.text()))
                    .toList();
            List<Embedding> embeddings = embeddingModel.embedAll(segments).content();
            if (embeddings == null || embeddings.size() != batch.size()) {
                throw new IllegalStateException("Embedding provider returned an unexpected batch size");
            }

            List<IndexedDocument> indexed = new ArrayList<>(batch.size());
            for (int i = 0; i < batch.size(); i++) {
                indexed.add(new IndexedDocument(batch.get(i), embeddings.get(i)));
            }
            upsertBatch(indexed);
            log.info("[Incremental RAG] Embedded {}/{} changed documents",
                    Math.min(start + batch.size(), changed.size()), changed.size());
        }
    }

    private void upsertBatch(List<IndexedDocument> documents) {
        validateIdentifier(vectorTable);
        String sql = """
                INSERT INTO %s
                    (embedding_id, embedding, text, metadata, source_type, source_id, content_hash, indexed_at)
                VALUES (?, CAST(? AS vector), ?, CAST(? AS json), ?, ?, ?, NOW())
                ON CONFLICT (embedding_id) DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    text = EXCLUDED.text,
                    metadata = EXCLUDED.metadata,
                    source_type = EXCLUDED.source_type,
                    source_id = EXCLUDED.source_id,
                    content_hash = EXCLUDED.content_hash,
                    indexed_at = NOW()
                """.formatted(vectorTable);

        jdbcTemplate.batchUpdate(sql, documents, documents.size(), this::bindIndexedDocument);
    }

    private void bindIndexedDocument(PreparedStatement statement, IndexedDocument indexedDocument) throws SQLException {
        SourceDocument document = indexedDocument.document();
        statement.setObject(1, deterministicId(document.key()));
        statement.setString(2, Arrays.toString(indexedDocument.embedding().vector()));
        statement.setString(3, document.text());
        statement.setString(4, document.metadataJson());
        statement.setString(5, document.key().sourceType());
        statement.setString(6, document.key().sourceId());
        statement.setString(7, document.contentHash());
    }

    private int deleteStaleVectors(Set<SourceKey> indexedKeys,
                                   List<SourceDocument> sourceDocuments,
                                   boolean jobTableAvailable) {
        if (!deleteStale || !jobTableAvailable) {
            return 0;
        }

        Set<SourceKey> currentKeys = new HashSet<>();
        sourceDocuments.forEach(document -> currentKeys.add(document.key()));
        if (currentKeys.isEmpty() && !allowEmptySource) {
            log.warn("[Incremental RAG] Refusing stale deletion because public.jobs has no active records");
            return 0;
        }

        List<SourceKey> stale = indexedKeys.stream()
                .filter(key -> !currentKeys.contains(key))
                .toList();
        if (stale.isEmpty()) {
            return 0;
        }

        validateIdentifier(vectorTable);
        jdbcTemplate.batchUpdate("DELETE FROM " + vectorTable + " WHERE source_type = ? AND source_id = ?",
                stale,
                stale.size(),
                (statement, key) -> {
                    statement.setString(1, key.sourceType());
                    statement.setString(2, key.sourceId());
                });
        return stale.size();
    }

    private SourceDocument sourceDocument(String sourceType,
                                          String sourceId,
                                          String text,
                                          Map<String, Object> metadata) {
        if (sourceId == null || sourceId.isBlank()) {
            throw new IllegalStateException(sourceType + " contains a blank source ID");
        }
        try {
            String metadataJson = objectMapper.writeValueAsString(metadata);
            return new SourceDocument(new SourceKey(sourceType, sourceId), text, metadataJson,
                    // Volatile crawl metadata (for example crawled_at_utc) must not
                    // trigger a paid re-embedding when semantic content is unchanged.
                    sha256(text));
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize RAG metadata for " + sourceId, exception);
        }
    }

    private void markRunCompleted(SyncResult result) {
        jdbcTemplate.update("""
                UPDATE rag_sync_runs
                SET status = 'COMPLETED', completed_at = NOW(), added_count = ?,
                    updated_count = ?, unchanged_count = ?, deleted_count = ?
                WHERE id = ?
                """, result.added(), result.updated(), result.unchanged(), result.deleted(), result.runId());
    }

    private void markRunFailed(Long runId, RuntimeException exception) {
        if (runId == null) {
            return;
        }
        String message = exception.getMessage();
        if (message != null && message.length() > 2000) {
            message = message.substring(0, 2000);
        }
        jdbcTemplate.update("""
                UPDATE rag_sync_runs
                SET status = 'FAILED', completed_at = NOW(), error_message = ?
                WHERE id = ?
                """, message, runId);
    }

    private boolean tableExists(String schema, String table) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables
                    WHERE table_schema = ? AND table_name = ?
                )
                """, Boolean.class, schema, table);
        return Boolean.TRUE.equals(exists);
    }

    private void validateConfiguration() {
        validateIdentifier(sourceSchema);
        validateIdentifier(jobTable);
        validateIdentifier(companyTable);
        validateIdentifier(vectorTable);
    }

    private void validateIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid SQL identifier: " + identifier);
        }
    }

    private static UUID deterministicId(SourceKey key) {
        String value = key.sourceType() + "\u0000" + key.sourceId();
        return UUID.nameUUIDFromBytes(value.getBytes(StandardCharsets.UTF_8));
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static String structuredText(String type, String... fields) {
        StringBuilder builder = new StringBuilder("[").append(type).append("]\n");
        for (String field : fields) {
            if (field != null && !field.isBlank()) {
                builder.append(field).append('\n');
            }
        }
        return builder.toString().trim();
    }

    private static String field(String label, String value) {
        return value == null || value.isBlank() ? null : label + ": " + value.trim();
    }

    private static String toString(Object value) {
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toString();
        }
        return value == null ? null : value.toString();
    }

    private record SourceKey(String sourceType, String sourceId) {
    }

    private record SourceDocument(SourceKey key, String text, String metadataJson, String contentHash) {
    }

    private record IndexedDocument(SourceDocument document, Embedding embedding) {
    }

    private record SourceLoadResult(List<SourceDocument> documents, boolean tableAvailable) {
        static SourceLoadResult unavailable() {
            return new SourceLoadResult(List.of(), false);
        }
    }

    public record SyncResult(long runId,
                             int added,
                             int updated,
                             int unchanged,
                             int deleted,
                             boolean alreadyRunning) {
        static SyncResult skippedBecauseRunning() {
            return new SyncResult(-1, 0, 0, 0, 0, true);
        }
    }
}
