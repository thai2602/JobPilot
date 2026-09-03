-- Separate immutable/raw crawler input from the canonical application model.
--
-- Current installations may have the crawler-shaped tables in public because
-- V5 created them there after the legacy application tables were removed.  In
-- that case we move (not copy/drop) those tables into the crawler schema.  On a
-- fresh installation V1 already owns public.companies/public.jobs, so we keep
-- them in place and only create the staging tables below.

CREATE SCHEMA IF NOT EXISTS crawler;

DO $$
BEGIN
    IF to_regclass('public.companies') IS NOT NULL
       AND to_regclass('crawler.companies') IS NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'companies'
             AND column_name = 'company_id'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'companies'
             AND column_name = 'id'
       ) THEN
        ALTER TABLE public.companies SET SCHEMA crawler;
    END IF;
END
$$;

DO $$
BEGIN
    IF to_regclass('public.jobs') IS NOT NULL
       AND to_regclass('crawler.jobs') IS NULL
       AND EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'jobs'
             AND column_name = 'job_id'
       )
       AND NOT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'jobs'
             AND column_name = 'id'
       ) THEN
        ALTER TABLE public.jobs SET SCHEMA crawler;
    END IF;
END
$$;

-- Raw crawler storage.  These columns intentionally mirror the crawler output
-- and are not referenced by application foreign keys.
CREATE TABLE IF NOT EXISTS crawler.companies (
    company_id          TEXT PRIMARY KEY,
    company_name        TEXT NOT NULL,
    normalized_name     TEXT,
    website             TEXT,
    domain              TEXT,
    industry            TEXT,
    company_size        TEXT,
    headquarters        TEXT,
    locations           JSONB NOT NULL DEFAULT '[]'::jsonb,
    description         TEXT,
    products_services   TEXT,
    tech_stack          JSONB NOT NULL DEFAULT '[]'::jsonb,
    culture             TEXT,
    benefits            TEXT,
    career_page         TEXT,
    source              TEXT,
    source_url          TEXT,
    logo_url            TEXT,
    crawled_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT crawler_companies_locations_is_array
        CHECK (jsonb_typeof(locations) = 'array'),
    CONSTRAINT crawler_companies_tech_stack_is_array
        CHECK (jsonb_typeof(tech_stack) = 'array')
);

CREATE TABLE IF NOT EXISTS crawler.jobs (
    job_id              TEXT PRIMARY KEY,
    title               TEXT NOT NULL,
    industry            TEXT,
    company             TEXT,
    salary              TEXT,
    location            TEXT,
    experience          TEXT,
    level               TEXT,
    employment_type     TEXT,
    quantity            INTEGER,
    deadline            TIMESTAMPTZ,
    skills              JSONB NOT NULL DEFAULT '[]'::jsonb,
    job_description     TEXT,
    requirements        TEXT,
    benefits            TEXT,
    url                 TEXT,
    query               TEXT,
    crawled_at_utc      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT crawler_jobs_quantity_non_negative
        CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT crawler_jobs_skills_is_array
        CHECK (jsonb_typeof(skills) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_crawler_companies_normalized_name
    ON crawler.companies (normalized_name);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_domain
    ON crawler.companies (domain);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_crawled_at
    ON crawler.companies (crawled_at_utc);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_locations_gin
    ON crawler.companies USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_tech_stack_gin
    ON crawler.companies USING GIN (tech_stack);

CREATE INDEX IF NOT EXISTS idx_crawler_jobs_company
    ON crawler.jobs (company);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_deadline
    ON crawler.jobs (deadline);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_crawled_at
    ON crawler.jobs (crawled_at_utc);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_skills_gin
    ON crawler.jobs USING GIN (skills);

-- Canonical application tables.  The original V1/JPA columns remain the public
-- contract used by API, frontend, saved jobs, applications and recommendations.
CREATE TABLE IF NOT EXISTS public.companies (
    id                  BIGSERIAL PRIMARY KEY,
    employer_id         BIGINT REFERENCES public.users(id),
    name                VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    logo_url            TEXT,
    color               VARCHAR(20),
    website             VARCHAR(255),
    tax_code            VARCHAR(100),
    industry_id         BIGINT REFERENCES public.categories(id),
    size                VARCHAR(50),
    description         TEXT,
    culture             TEXT,
    benefits            TEXT,
    is_featured         BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted          BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS public.jobs (
    id                  BIGSERIAL PRIMARY KEY,
    company_id          BIGINT REFERENCES public.companies(id),
    title               VARCHAR(255) NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    industry_id         BIGINT REFERENCES public.categories(id),
    job_type            VARCHAR(50),
    job_level           VARCHAR(50),
    experience_years    VARCHAR(50),
    salary_min          NUMERIC(15, 2),
    salary_max          NUMERIC(15, 2),
    currency            VARCHAR(10) DEFAULT 'VND',
    location_city       VARCHAR(100),
    location_address    TEXT,
    description         TEXT,
    requirements        TEXT,
    benefits            TEXT,
    status              VARCHAR(50) DEFAULT 'PUBLISHED',
    expired_at          TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted          BOOLEAN DEFAULT FALSE
);

-- Canonical provenance fields used by idempotent upsert and incremental RAG.
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS color VARCHAR(20),
    ADD COLUMN IF NOT EXISTS external_id TEXT,
    ADD COLUMN IF NOT EXISTS source VARCHAR(64) NOT NULL DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS domain TEXT,
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS headquarters TEXT,
    ADD COLUMN IF NOT EXISTS locations JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS products_services TEXT,
    ADD COLUMN IF NOT EXISTS tech_stack JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS career_page TEXT,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS crawled_at_utc TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS source_content_hash CHAR(64);

ALTER TABLE public.jobs
    ADD COLUMN IF NOT EXISTS industry_id BIGINT,
    ADD COLUMN IF NOT EXISTS external_id TEXT,
    ADD COLUMN IF NOT EXISTS source VARCHAR(64) NOT NULL DEFAULT 'legacy',
    ADD COLUMN IF NOT EXISTS industry TEXT,
    ADD COLUMN IF NOT EXISTS salary_raw TEXT,
    ADD COLUMN IF NOT EXISTS location_raw TEXT,
    ADD COLUMN IF NOT EXISTS quantity INTEGER,
    ADD COLUMN IF NOT EXISTS skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS crawler_query TEXT,
    ADD COLUMN IF NOT EXISTS crawled_at_utc TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS source_content_hash CHAR(64);

-- Columns introduced by the current JPA models after the original V1 schema.
-- Keeping them in SQL allows ddl-auto=none on a fresh installation.
ALTER TABLE IF EXISTS public.saved_jobs
    ADD COLUMN IF NOT EXISTS id BIGINT GENERATED BY DEFAULT AS IDENTITY,
    ADD COLUMN IF NOT EXISTS saved_at TIMESTAMP;

ALTER TABLE IF EXISTS public.applications
    ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS tracking_note TEXT;

UPDATE public.companies
SET external_id = 'legacy:' || id
WHERE external_id IS NULL;

UPDATE public.jobs
SET external_id = 'legacy:' || id
WHERE external_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_source_external_id
    ON public.companies (source, external_id)
    WHERE external_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_jobs_source_external_id
    ON public.jobs (source, external_id)
    WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_public_companies_normalized_name
    ON public.companies (normalized_name);
CREATE INDEX IF NOT EXISTS idx_public_companies_domain
    ON public.companies (domain);
CREATE INDEX IF NOT EXISTS idx_public_jobs_status_expired_at
    ON public.jobs (status, expired_at)
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_public_jobs_company_id
    ON public.jobs (company_id);
CREATE INDEX IF NOT EXISTS idx_public_jobs_skills_gin
    ON public.jobs USING GIN (skills);
CREATE UNIQUE INDEX IF NOT EXISTS uq_saved_jobs_id
    ON public.saved_jobs (id);

-- Reconnect relations that may have been removed by DROP ... CASCADE.  NOT
-- VALID checks new writes immediately and lets legacy data be restored before
-- the existing rows are validated explicitly.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_employer_id_fkey' AND conrelid = 'public.companies'::regclass) THEN
        ALTER TABLE public.companies
            ADD CONSTRAINT companies_employer_id_fkey
            FOREIGN KEY (employer_id) REFERENCES public.users(id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'companies_industry_id_fkey' AND conrelid = 'public.companies'::regclass) THEN
        ALTER TABLE public.companies
            ADD CONSTRAINT companies_industry_id_fkey
            FOREIGN KEY (industry_id) REFERENCES public.categories(id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_company_id_fkey' AND conrelid = 'public.jobs'::regclass) THEN
        ALTER TABLE public.jobs
            ADD CONSTRAINT jobs_company_id_fkey
            FOREIGN KEY (company_id) REFERENCES public.companies(id) NOT VALID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_industry_id_fkey' AND conrelid = 'public.jobs'::regclass) THEN
        ALTER TABLE public.jobs
            ADD CONSTRAINT jobs_industry_id_fkey
            FOREIGN KEY (industry_id) REFERENCES public.categories(id) NOT VALID;
    END IF;
    IF to_regclass('public.job_skills') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'job_skills_job_id_fkey' AND conrelid = 'public.job_skills'::regclass) THEN
        ALTER TABLE public.job_skills
            ADD CONSTRAINT job_skills_job_id_fkey
            FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF to_regclass('public.saved_jobs') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'saved_jobs_job_id_fkey' AND conrelid = 'public.saved_jobs'::regclass) THEN
        ALTER TABLE public.saved_jobs
            ADD CONSTRAINT saved_jobs_job_id_fkey
            FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE NOT VALID;
    END IF;
    IF to_regclass('public.applications') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_job_id_fkey' AND conrelid = 'public.applications'::regclass) THEN
        ALTER TABLE public.applications
            ADD CONSTRAINT applications_job_id_fkey
            FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE NOT VALID;
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.crawler_normalization_runs (
    id                  BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    status              VARCHAR(24) NOT NULL,
    company_rows        INTEGER NOT NULL DEFAULT 0,
    company_upserts     INTEGER NOT NULL DEFAULT 0,
    job_rows            INTEGER NOT NULL DEFAULT 0,
    job_upserts         INTEGER NOT NULL DEFAULT 0,
    placeholder_companies INTEGER NOT NULL DEFAULT 0,
    error_message       TEXT
);

COMMENT ON SCHEMA crawler IS 'Raw, source-shaped crawler input; never queried directly by the application API.';
COMMENT ON TABLE public.companies IS 'Canonical company records consumed by API, frontend and RAG.';
COMMENT ON TABLE public.jobs IS 'Canonical job records consumed by API, frontend and RAG.';
