CREATE EXTENSION IF NOT EXISTS vector;

-- Create the LangChain4j-compatible stores here so later tracking migrations
-- also work on a completely fresh database (before Spring starts once).
CREATE TABLE IF NOT EXISTS public.rag_hr_embeddings (
    embedding_id UUID PRIMARY KEY,
    embedding VECTOR(1536),
    text TEXT,
    metadata JSON
);

CREATE TABLE IF NOT EXISTS public.rag_job_embeddings (
    embedding_id UUID PRIMARY KEY,
    embedding VECTOR(1536),
    text TEXT,
    metadata JSON
);

CREATE TABLE IF NOT EXISTS rag_index_state (
    store_name VARCHAR(64) PRIMARY KEY,
    status VARCHAR(24) NOT NULL,
    row_count BIGINT NOT NULL DEFAULT 0,
    source VARCHAR(255),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
