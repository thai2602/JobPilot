-- Final index names after moving the former public crawler tables.  The DROP
-- statements only remove exact duplicate indexes created under their old V5
-- names; source data and constraints are untouched.

DROP INDEX IF EXISTS crawler.idx_companies_normalized_name;
DROP INDEX IF EXISTS crawler.idx_companies_domain;
DROP INDEX IF EXISTS crawler.idx_companies_locations_gin;
DROP INDEX IF EXISTS crawler.idx_companies_tech_stack_gin;
DROP INDEX IF EXISTS crawler.idx_jobs_company;
DROP INDEX IF EXISTS crawler.idx_jobs_deadline;
DROP INDEX IF EXISTS crawler.idx_jobs_skills_gin;

DO $$
BEGIN
    IF to_regclass('crawler.idx_companies_industry') IS NOT NULL
       AND to_regclass('crawler.idx_crawler_companies_industry') IS NULL THEN
        ALTER INDEX crawler.idx_companies_industry RENAME TO idx_crawler_companies_industry;
    END IF;
    IF to_regclass('crawler.idx_jobs_title') IS NOT NULL
       AND to_regclass('crawler.idx_crawler_jobs_title') IS NULL THEN
        ALTER INDEX crawler.idx_jobs_title RENAME TO idx_crawler_jobs_title;
    END IF;
    IF to_regclass('crawler.idx_jobs_industry') IS NOT NULL
       AND to_regclass('crawler.idx_crawler_jobs_industry') IS NULL THEN
        ALTER INDEX crawler.idx_jobs_industry RENAME TO idx_crawler_jobs_industry;
    END IF;
    IF to_regclass('crawler.idx_jobs_location') IS NOT NULL
       AND to_regclass('crawler.idx_crawler_jobs_location') IS NULL THEN
        ALTER INDEX crawler.idx_jobs_location RENAME TO idx_crawler_jobs_location;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_public_companies_name
    ON public.companies (name);
CREATE INDEX IF NOT EXISTS idx_public_jobs_title
    ON public.jobs (title);
CREATE INDEX IF NOT EXISTS idx_public_jobs_location_city
    ON public.jobs (location_city);

UPDATE public.companies
SET external_id = 'legacy:' || id
WHERE external_id IS NULL AND source = 'legacy';

UPDATE public.jobs
SET external_id = 'legacy:' || id
WHERE external_id IS NULL AND source = 'legacy';
