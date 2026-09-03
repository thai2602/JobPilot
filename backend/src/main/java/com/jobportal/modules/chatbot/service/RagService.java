package com.jobportal.modules.chatbot.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.jobportal.modules.chatbot.rag.Chunkers;
import com.jobportal.modules.chatbot.rag.LegacyEmbeddingImporter;
import com.jobportal.modules.chatbot.rag.Loaders;
import com.jobportal.modules.chatbot.rag.RagIndexStateStore;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

/**
 * Triple RAG Pipeline Service: HR, active jobs và historical jobs.
 *
 * <pre>
 *   hrKnowledgeStore  ← raw/ (hr_rules, ats_guides)      → PostgreSQL/pgvector
 *   jobMarketStore    ← public.jobs (IncrementalRagSyncService) → PostgreSQL/pgvector
 * </pre>
 *
 * File ingestion chỉ còn áp dụng cho kho tri thức HR. Job Store luôn được đồng
 * bộ từ database bởi IncrementalRagSyncService.
 */
@Slf4j
@Service
public class RagService {

    @Getter
    private final EmbeddingStore<TextSegment> hrKnowledgeStore;
    @Getter
    private final EmbeddingStore<TextSegment> jobMarketStore;
    @Getter
    private final EmbeddingStore<TextSegment> historicalJobStore;
    @Getter
    private final EmbeddingModel embeddingModel;

    private final Loaders loaders;
    private final Chunkers chunkers;
    private final LegacyEmbeddingImporter legacyEmbeddingImporter;
    private final RagIndexStateStore indexStateStore;

    @Value("${rag.data.path:src/main/resources/rag-data}")
    private String ragDataPath;

    @Value("${rag.pgvector.legacy-import:true}")
    private boolean legacyImport;

    @Value("${rag.pgvector.hr-table:rag_hr_embeddings}")
    private String hrTable;

    @Autowired
    public RagService(
            @Qualifier("hrKnowledgeStore")  EmbeddingStore<TextSegment> hrKnowledgeStore,
            @Qualifier("jobMarketStore")    EmbeddingStore<TextSegment> jobMarketStore,
            @Qualifier("historicalJobStore") EmbeddingStore<TextSegment> historicalJobStore,
            EmbeddingModel embeddingModel,
            Loaders loaders,
            Chunkers chunkers,
            LegacyEmbeddingImporter legacyEmbeddingImporter,
            RagIndexStateStore indexStateStore) {
        this.hrKnowledgeStore = hrKnowledgeStore;
        this.jobMarketStore   = jobMarketStore;
        this.historicalJobStore = historicalJobStore;
        this.embeddingModel   = embeddingModel;
        this.loaders          = loaders;
        this.chunkers         = chunkers;
        this.legacyEmbeddingImporter = legacyEmbeddingImporter;
        this.indexStateStore = indexStateStore;
    }

    // ── Startup ───────────────────────────────────────────────────────────────

    @PostConstruct
    public void init() {
        log.info("╔══════════════════════════════════════════╗");
        log.info("║    Initializing Triple RAG Pipeline      ║");
        log.info("╚══════════════════════════════════════════╝");
        try {
            initHrKnowledgeStore();
            log.info("[Job Store] File ingestion disabled; vectors are managed from public.jobs by IncrementalRagSyncService");
            log.info("[Historical Job Store] File ingestion disabled; vectors are managed from public.jobs");
            log.info("✅ RAG Pipeline Ready (HR + active jobs + historical jobs)");
        } catch (Exception e) {
            log.error("❌ Failed to initialize RAG pipeline", e);
        }
    }

    // ── HR Knowledge Store ────────────────────────────────────────────────────

    private void initHrKnowledgeStore() throws Exception {
        if (indexStateStore.isReady("hr", hrTable)) {
            log.info("[HR Store] ✓ pgvector is ready ({} rows). Skipping ingestion.",
                    indexStateStore.count(hrTable));
            return;
        }

        Path legacyPath = Paths.get(ragDataPath, "embeddings", "hr_store.json");
        if (migrateLegacyStore("hr", hrTable, legacyPath, hrKnowledgeStore, "HR Store")) {
            return;
        }

        Path rawPath = Paths.get(ragDataPath, "raw");
        if (!Files.exists(rawPath)) {
            Files.createDirectories(rawPath);
            log.warn("[HR Store] raw/ directory was missing — created. Add HR documents and restart.");
            return;
        }

        List<Document> docs = new ArrayList<>();
        
        Path hrRulesPath = rawPath.resolve("hr_rules");
        if (Files.exists(hrRulesPath)) {
            docs.addAll(loaders.loadDocumentsFromPath(hrRulesPath));
        }
        
        Path atsGuidesPath = rawPath.resolve("ats_guides");
        if (Files.exists(atsGuidesPath)) {
            docs.addAll(loaders.loadDocumentsFromPath(atsGuidesPath));
        }

        if (docs.isEmpty()) {
            log.warn("[HR Store] No HR rules or ATS guides documents found in {}", rawPath.toAbsolutePath());
            return;
        }

        log.info("[HR Store] Loaded {} document(s) from hr_rules/ats_guides. Chunking...", docs.size());
        List<TextSegment> segments = chunkers.smartSplitAll(docs);
        ingestFreshStore("hr", hrTable, segments, hrKnowledgeStore, "HR Store");
    }

    // ── Shared migration / ingestion ─────────────────────────────────────────

    private boolean migrateLegacyStore(String storeName,
                                       String table,
                                       Path legacyPath,
                                       EmbeddingStore<TextSegment> store,
                                       String label) throws Exception {
        if (!legacyImport || !Files.exists(legacyPath)) {
            return false;
        }

        String source = "legacy-json:" + legacyPath.getFileName();
        indexStateStore.prepareImport(storeName, table, source);
        try {
            long imported = legacyEmbeddingImporter.importFile(legacyPath, store, label);
            long persisted = indexStateStore.markReady(storeName, table, source);
            if (persisted != imported) {
                throw new IllegalStateException(label + " row count mismatch: imported=" + imported
                        + ", persisted=" + persisted);
            }
            log.info("[{}] ✓ Migrated {} vectors from {} into pgvector table {}",
                    label, persisted, legacyPath.toAbsolutePath(), table);
            return true;
        } catch (Exception exception) {
            indexStateStore.markFailed(storeName, source);
            throw exception;
        }
    }

    private void ingestFreshStore(String storeName,
                                  String table,
                                  List<TextSegment> segments,
                                  EmbeddingStore<TextSegment> store,
                                  String label) {

        String source = "source-documents";
        indexStateStore.prepareImport(storeName, table, source);

        List<Document> segmentDocs = segments.stream()
                .map(seg -> Document.from(seg.text(), seg.metadata()))
                .collect(Collectors.toList());

        EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                .embeddingModel(embeddingModel)
                .embeddingStore(store)
                .build();

        try {
            // Batch nhỏ để tránh timeout và giới hạn payload của embedding provider.
            int batchSize = 500;
            int totalSegments = segmentDocs.size();
            for (int i = 0; i < totalSegments; i += batchSize) {
                List<Document> batch = segmentDocs.subList(i, Math.min(i + batchSize, totalSegments));
                log.info("[{}] Ingesting batch {}/{} (size: {})...", label, (i / batchSize) + 1,
                        (totalSegments + batchSize - 1) / batchSize, batch.size());
                ingestor.ingest(batch);
            }

            long persisted = indexStateStore.markReady(storeName, table, source);
            log.info("[{}] Embedded and persisted {} segment(s) in pgvector.", label, persisted);
        } catch (RuntimeException exception) {
            indexStateStore.markFailed(storeName, source);
            throw exception;
        }
    }
}
