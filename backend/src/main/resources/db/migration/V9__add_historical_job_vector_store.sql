-- Dedicated pgvector store for closed/expired jobs used in market analysis.

CREATE TABLE IF NOT EXISTS public.rag_historical_job_embeddings (
    embedding_id UUID PRIMARY KEY,
    embedding VECTOR(1536),
    text TEXT,
    metadata JSON,
    source_type VARCHAR(64),
    source_id TEXT,
    content_hash CHAR(64),
    indexed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rag_historical_job_source
    ON public.rag_historical_job_embeddings (source_type, source_id)
    WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rag_historical_job_content_hash
    ON public.rag_historical_job_embeddings (content_hash);

CREATE INDEX IF NOT EXISTS idx_rag_historical_job_source_type
    ON public.rag_historical_job_embeddings (source_type);

ALTER TABLE public.rag_sync_runs
    ADD COLUMN IF NOT EXISTS store_name VARCHAR(64) NOT NULL DEFAULT 'job';

CREATE INDEX IF NOT EXISTS idx_rag_sync_runs_store_started
    ON public.rag_sync_runs (store_name, started_at DESC);
