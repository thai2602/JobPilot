package com.jobportal.modules.crawler;

import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.jobportal.modules.chatbot.rag.IncrementalRagSyncService;
import com.jobportal.modules.crawler.CrawlerNormalizationService.NormalizationResult;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Runs the ordered crawler -> canonical -> incremental RAG pipeline. */
@Slf4j
@Service
@RequiredArgsConstructor
public class CrawlerPipelineService {

    private final CrawlerNormalizationService normalizationService;
    private final IncrementalRagSyncService ragSyncService;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${crawler.pipeline.enabled:false}")
    private boolean enabled;

    @Value("${crawler.pipeline.run-on-start:false}")
    private boolean runOnStart;

    @Value("${crawler.pipeline.sync-rag:true}")
    private boolean syncRag;

    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        if (enabled && runOnStart) runSafely("startup");
    }

    @Scheduled(cron = "${crawler.pipeline.cron:0 */15 * * * *}")
    public void runOnSchedule() {
        if (enabled) runSafely("schedule");
    }

    /** Public entry point for an admin command, integration test or event consumer. */
    public PipelineResult runPipeline() {
        if (!running.compareAndSet(false, true)) {
            return PipelineResult.skippedBecauseRunning();
        }
        try {
            NormalizationResult normalization = normalizationService.normalizeAndUpsert();
            IncrementalRagSyncService.SyncResult rag = null;
            boolean ragSkipped = !syncRag || !ragSyncService.isEnabled();
            if (!ragSkipped && !normalization.alreadyRunning()) {
                rag = ragSyncService.synchronize();
            }
            return new PipelineResult(normalization, rag, ragSkipped, false);
        } finally {
            running.set(false);
        }
    }

    private void runSafely(String trigger) {
        try {
            PipelineResult result = runPipeline();
            if (result.alreadyRunning()) {
                log.info("[Crawler pipeline] Skipped {} trigger because another run is active", trigger);
            } else {
                log.info("[Crawler pipeline] {} run completed; RAG skipped={}", trigger, result.ragSkipped());
            }
        } catch (Exception exception) {
            log.error("[Crawler pipeline] {} run failed", trigger, exception);
        }
    }

    public record PipelineResult(
            NormalizationResult normalization,
            IncrementalRagSyncService.SyncResult rag,
            boolean ragSkipped,
            boolean alreadyRunning) {

        static PipelineResult skippedBecauseRunning() {
            return new PipelineResult(null, null, true, true);
        }
    }
}
