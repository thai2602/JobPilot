-- Raw company and job records collected by the crawler.
-- Application-facing canonical data remains in public.companies/public.jobs.

CREATE SCHEMA IF NOT EXISTS crawler;

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
CREATE INDEX IF NOT EXISTS idx_crawler_companies_industry
    ON crawler.companies (industry);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_locations_gin
    ON crawler.companies USING GIN (locations);
CREATE INDEX IF NOT EXISTS idx_crawler_companies_tech_stack_gin
    ON crawler.companies USING GIN (tech_stack);

CREATE INDEX IF NOT EXISTS idx_crawler_jobs_title
    ON crawler.jobs (title);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_company
    ON crawler.jobs (company);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_industry
    ON crawler.jobs (industry);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_location
    ON crawler.jobs (location);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_deadline
    ON crawler.jobs (deadline);
CREATE INDEX IF NOT EXISTS idx_crawler_jobs_skills_gin
    ON crawler.jobs USING GIN (skills);
