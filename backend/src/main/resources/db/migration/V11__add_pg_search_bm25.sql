-- ParadeDB pg_search lexical indexes for real BM25 ranking.
-- V10's native PostgreSQL TSVECTOR/GIN indexes intentionally remain available
-- as a runtime fallback if pg_search cannot serve a query.

CREATE EXTENSION IF NOT EXISTS pg_search CASCADE;

ALTER TABLE public.rag_job_embeddings
    ADD COLUMN IF NOT EXISTS bm25_title TEXT
        GENERATED ALWAYS AS (COALESCE(metadata ->> 'title', '')) STORED,
    ADD COLUMN IF NOT EXISTS bm25_company TEXT
        GENERATED ALWAYS AS (COALESCE(metadata ->> 'company', '')) STORED;

ALTER TABLE public.rag_historical_job_embeddings
    ADD COLUMN IF NOT EXISTS bm25_title TEXT
        GENERATED ALWAYS AS (COALESCE(metadata ->> 'title', '')) STORED,
    ADD COLUMN IF NOT EXISTS bm25_company TEXT
        GENERATED ALWAYS AS (COALESCE(metadata ->> 'company', '')) STORED;

-- One ParadeDB index per table keeps all searchable fields in the same index.
-- `simple` preserves technical terms while ASCII folding makes an unaccented
-- Vietnamese query match accented job content.
CREATE INDEX IF NOT EXISTS idx_rag_job_embeddings_paradedb
    ON public.rag_job_embeddings
    USING paradedb (
        embedding_id,
        (bm25_title::pdb.simple('ascii_folding=true')),
        (bm25_company::pdb.simple('ascii_folding=true')),
        (text::pdb.simple('ascii_folding=true')),
        (source_type::pdb.literal),
        (source_id::pdb.literal)
    )
    WITH (key_field = 'embedding_id');

CREATE INDEX IF NOT EXISTS idx_rag_historical_job_embeddings_paradedb
    ON public.rag_historical_job_embeddings
    USING paradedb (
        embedding_id,
        (bm25_title::pdb.simple('ascii_folding=true')),
        (bm25_company::pdb.simple('ascii_folding=true')),
        (text::pdb.simple('ascii_folding=true')),
        (source_type::pdb.literal),
        (source_id::pdb.literal)
    )
    WITH (key_field = 'embedding_id');
