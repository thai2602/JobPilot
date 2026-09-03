-- Native PostgreSQL lexical search for the Active and Historical Job Stores.
-- `simple` preserves technical tokens while unaccent lets unaccented Vietnamese
-- queries match accented job text. Generated vectors stay in sync on every upsert.

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.jobpilot_unaccent(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
    SELECT public.unaccent('public.unaccent', input)
$$;

ALTER TABLE public.rag_job_embeddings
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'title', ''))), 'A') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'company', ''))), 'B') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'location', ''))), 'C') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(text, ''))), 'B')
    ) STORED;

ALTER TABLE public.rag_historical_job_embeddings
    ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'title', ''))), 'A') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'company', ''))), 'B') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(metadata ->> 'location', ''))), 'C') ||
        setweight(to_tsvector('simple', public.jobpilot_unaccent(COALESCE(text, ''))), 'B')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_rag_job_search_vector_gin
    ON public.rag_job_embeddings USING GIN (search_vector)
    WHERE source_type = 'database_job';

CREATE INDEX IF NOT EXISTS idx_rag_historical_job_search_vector_gin
    ON public.rag_historical_job_embeddings USING GIN (search_vector)
    WHERE source_type = 'historical_job';
