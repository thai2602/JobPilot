package com.jobportal.modules.chatbot.rag;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;

/** Theo dõi một lần import hoàn chỉnh để không bỏ qua dữ liệu khi lần import trước bị dở dang. */
@Component
@RequiredArgsConstructor
public class RagIndexStateStore {

    private final JdbcTemplate jdbcTemplate;

    @PostConstruct
    void initialize() {
        jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS rag_index_state (
                    store_name VARCHAR(64) PRIMARY KEY,
                    status VARCHAR(24) NOT NULL,
                    row_count BIGINT NOT NULL DEFAULT 0,
                    source VARCHAR(255),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """);
    }

    public boolean isReady(String storeName, String table) {
        validateIdentifier(table);
        Long expected = jdbcTemplate.query(
                "SELECT row_count FROM rag_index_state WHERE store_name = ? AND status = 'READY'",
                resultSet -> resultSet.next() ? resultSet.getLong(1) : null,
                storeName);
        return expected != null && expected == countLegacyRows(storeName, table);
    }

    public void prepareImport(String storeName, String table, String source) {
        validateIdentifier(table);
        if (hasIncrementalColumns(table)) {
            jdbcTemplate.update("DELETE FROM " + table
                    + " WHERE source_type IS NULL OR source_type = ?", legacySourceType(storeName));
        } else {
            jdbcTemplate.execute("DELETE FROM " + table);
        }
        jdbcTemplate.update("""
                INSERT INTO rag_index_state (store_name, status, row_count, source, updated_at)
                VALUES (?, 'IMPORTING', 0, ?, NOW())
                ON CONFLICT (store_name) DO UPDATE SET
                    status = EXCLUDED.status,
                    row_count = 0,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                """, storeName, source);
    }

    public long markReady(String storeName, String table, String source) {
        if (hasIncrementalColumns(table)) {
            jdbcTemplate.update("UPDATE " + table + " SET source_type = ?, "
                            + "source_id = embedding_id::text, indexed_at = COALESCE(indexed_at, NOW()) "
                            + "WHERE source_type IS NULL",
                    legacySourceType(storeName));
        }
        long rowCount = countLegacyRows(storeName, table);
        jdbcTemplate.update("""
                INSERT INTO rag_index_state (store_name, status, row_count, source, updated_at)
                VALUES (?, 'READY', ?, ?, NOW())
                ON CONFLICT (store_name) DO UPDATE SET
                    status = EXCLUDED.status,
                    row_count = EXCLUDED.row_count,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                """, storeName, rowCount, source);
        return rowCount;
    }

    public void markFailed(String storeName, String source) {
        jdbcTemplate.update("""
                INSERT INTO rag_index_state (store_name, status, row_count, source, updated_at)
                VALUES (?, 'FAILED', 0, ?, NOW())
                ON CONFLICT (store_name) DO UPDATE SET
                    status = EXCLUDED.status,
                    source = EXCLUDED.source,
                    updated_at = NOW()
                """, storeName, source);
    }

    public long count(String table) {
        validateIdentifier(table);
        Long count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + table, Long.class);
        return count == null ? 0 : count;
    }

    private long countLegacyRows(String storeName, String table) {
        if (!hasIncrementalColumns(table)) {
            return count(table);
        }
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE source_type = ?",
                Long.class,
                legacySourceType(storeName));
        return count == null ? 0 : count;
    }

    private boolean hasIncrementalColumns(String table) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = current_schema()
                      AND table_name = ?
                      AND column_name = 'source_type'
                )
                """, Boolean.class, table);
        return Boolean.TRUE.equals(exists);
    }

    private String legacySourceType(String storeName) {
        if (!storeName.matches("[A-Za-z0-9_]+")) {
            throw new IllegalArgumentException("Invalid RAG store name: " + storeName);
        }
        return "legacy_" + storeName;
    }

    private void validateIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid pgvector table name: " + identifier);
        }
    }
}
