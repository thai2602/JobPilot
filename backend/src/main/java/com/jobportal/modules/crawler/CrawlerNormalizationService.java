package com.jobportal.modules.crawler;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;

/**
 * Converts source-shaped crawler rows into the stable public application model.
 *
 * <p>The operation is deliberately idempotent: {@code (source, external_id)}
 * identifies a canonical row and {@code source_content_hash} prevents an
 * unchanged crawl timestamp from touching {@code updated_at}. This gives the
 * downstream RAG index a reliable change signal.</p>
 */
@Slf4j
@Service
public class CrawlerNormalizationService {

    private static final Pattern NUMBER_PATTERN = Pattern.compile("\\d+(?:[.,]\\d+)*");
    private static final String PLACEHOLDER_SOURCE = "crawler_job";

    private static final String COMPANY_UPSERT_SQL = """
            INSERT INTO public.companies (
                name, slug, logo_url, website, size, description, culture,
                benefits, is_featured, external_id, source, normalized_name,
                domain, industry, headquarters, locations, products_services,
                tech_stack, career_page, source_url, crawled_at_utc, raw_data,
                source_content_hash, is_deleted
            ) VALUES (
                :name, :slug, :logoUrl, :website, :size, :description, :culture,
                :benefits, FALSE, :externalId, :source, :normalizedName,
                :domain, :industry, :headquarters, CAST(:locations AS jsonb),
                :productsServices, CAST(:techStack AS jsonb), :careerPage,
                :sourceUrl, :crawledAt, CAST(:rawData AS jsonb), :contentHash,
                FALSE
            )
            ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
            DO UPDATE SET
                name = EXCLUDED.name,
                slug = EXCLUDED.slug,
                logo_url = EXCLUDED.logo_url,
                website = EXCLUDED.website,
                size = EXCLUDED.size,
                description = EXCLUDED.description,
                culture = EXCLUDED.culture,
                benefits = EXCLUDED.benefits,
                normalized_name = EXCLUDED.normalized_name,
                domain = EXCLUDED.domain,
                industry = EXCLUDED.industry,
                headquarters = EXCLUDED.headquarters,
                locations = EXCLUDED.locations,
                products_services = EXCLUDED.products_services,
                tech_stack = EXCLUDED.tech_stack,
                career_page = EXCLUDED.career_page,
                source_url = EXCLUDED.source_url,
                crawled_at_utc = EXCLUDED.crawled_at_utc,
                raw_data = EXCLUDED.raw_data,
                source_content_hash = EXCLUDED.source_content_hash,
                updated_at = CURRENT_TIMESTAMP,
                is_deleted = FALSE
            WHERE public.companies.source_content_hash IS DISTINCT FROM EXCLUDED.source_content_hash
            """;

    private static final String JOB_UPSERT_SQL = """
            INSERT INTO public.jobs (
                company_id, title, slug, job_type, job_level, experience_years,
                salary_min, salary_max, currency, location_city,
                location_address, description, requirements, benefits, status,
                expired_at, external_id, source, industry, salary_raw,
                location_raw, quantity, skills, source_url, crawler_query,
                crawled_at_utc, raw_data, source_content_hash, is_deleted
            ) VALUES (
                :companyId, :title, :slug, :jobType, :jobLevel,
                :experienceYears, :salaryMin, :salaryMax, :currency,
                :locationCity, :locationAddress, :description, :requirements,
                :benefits, :status, :expiredAt, :externalId, :source, :industry,
                :salaryRaw, :locationRaw, :quantity, CAST(:skills AS jsonb),
                :sourceUrl, :crawlerQuery, :crawledAt,
                CAST(:rawData AS jsonb), :contentHash, FALSE
            )
            ON CONFLICT (source, external_id) WHERE external_id IS NOT NULL
            DO UPDATE SET
                company_id = EXCLUDED.company_id,
                title = EXCLUDED.title,
                slug = EXCLUDED.slug,
                job_type = EXCLUDED.job_type,
                job_level = EXCLUDED.job_level,
                experience_years = EXCLUDED.experience_years,
                salary_min = EXCLUDED.salary_min,
                salary_max = EXCLUDED.salary_max,
                currency = EXCLUDED.currency,
                location_city = EXCLUDED.location_city,
                location_address = EXCLUDED.location_address,
                description = EXCLUDED.description,
                requirements = EXCLUDED.requirements,
                benefits = EXCLUDED.benefits,
                status = EXCLUDED.status,
                expired_at = EXCLUDED.expired_at,
                industry = EXCLUDED.industry,
                salary_raw = EXCLUDED.salary_raw,
                location_raw = EXCLUDED.location_raw,
                quantity = EXCLUDED.quantity,
                skills = EXCLUDED.skills,
                source_url = EXCLUDED.source_url,
                crawler_query = EXCLUDED.crawler_query,
                crawled_at_utc = EXCLUDED.crawled_at_utc,
                raw_data = EXCLUDED.raw_data,
                source_content_hash = EXCLUDED.source_content_hash,
                updated_at = CURRENT_TIMESTAMP,
                is_deleted = FALSE
            WHERE public.jobs.source_content_hash IS DISTINCT FROM EXCLUDED.source_content_hash
               OR public.jobs.company_id IS DISTINCT FROM EXCLUDED.company_id
               OR public.jobs.status IS DISTINCT FROM EXCLUDED.status
            """;

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedJdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AtomicBoolean running = new AtomicBoolean(false);

    @Value("${crawler.source-schema:crawler}")
    private String sourceSchema;

    @Value("${crawler.company-table:companies}")
    private String companyTable;

    @Value("${crawler.job-table:jobs}")
    private String jobTable;

    @Value("${crawler.default-source:crawler}")
    private String defaultSource;

    public CrawlerNormalizationService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedJdbcTemplate = new NamedParameterJdbcTemplate(jdbcTemplate);
        this.objectMapper = objectMapper;
    }

    public NormalizationResult normalizeAndUpsert() {
        validateConfiguration();
        if (!running.compareAndSet(false, true)) {
            return NormalizationResult.skippedBecauseRunning();
        }

        Long runId = jdbcTemplate.queryForObject("""
                INSERT INTO public.crawler_normalization_runs (status)
                VALUES ('RUNNING')
                RETURNING id
                """, Long.class);

        try {
            List<RawCompany> rawCompanies = loadRawCompanies();
            List<MapSqlParameterSource> companyInputs = rawCompanies.stream()
                    .map(this::companyParameters)
                    .toList();
            int companyUpserts = executeBatch(COMPANY_UPSERT_SQL, companyInputs);

            List<RawJob> rawJobs = loadRawJobs();
            Map<String, Long> companyLookup = loadCompanyLookup();
            List<MapSqlParameterSource> placeholders = buildPlaceholderCompanies(rawJobs, companyLookup);
            int placeholderUpserts = executeBatch(COMPANY_UPSERT_SQL, placeholders);
            if (!placeholders.isEmpty()) {
                companyLookup = loadCompanyLookup();
            }

            List<MapSqlParameterSource> jobInputs = new ArrayList<>(rawJobs.size());
            for (RawJob rawJob : rawJobs) {
                jobInputs.add(jobParameters(rawJob, companyLookup));
            }
            int jobUpserts = executeBatch(JOB_UPSERT_SQL, jobInputs);

            NormalizationResult result = new NormalizationResult(
                    runId == null ? -1L : runId,
                    rawCompanies.size(),
                    companyUpserts,
                    rawJobs.size(),
                    jobUpserts,
                    placeholderUpserts,
                    false);
            markRunCompleted(result);
            log.info("[Crawler normalize] companies={}/{}, jobs={}/{}, placeholders={}",
                    companyUpserts, rawCompanies.size(), jobUpserts, rawJobs.size(), placeholderUpserts);
            return result;
        } catch (RuntimeException exception) {
            markRunFailed(runId, exception);
            throw exception;
        } finally {
            running.set(false);
        }
    }

    private List<RawCompany> loadRawCompanies() {
        if (!tableExists(sourceSchema, companyTable)) {
            throw new IllegalStateException("Crawler company table does not exist: " + sourceSchema + "." + companyTable);
        }
        String sql = """
                SELECT company_id, company_name, normalized_name, website, domain,
                       industry, company_size, headquarters, locations::text,
                       description, products_services, tech_stack::text, culture,
                       benefits, career_page, source, source_url, logo_url,
                       crawled_at_utc, to_jsonb(c)::text AS raw_json
                FROM %s.%s c
                """.formatted(sourceSchema, companyTable);
        return jdbcTemplate.query(sql, this::mapRawCompany);
    }

    private List<RawJob> loadRawJobs() {
        if (!tableExists(sourceSchema, jobTable)) {
            throw new IllegalStateException("Crawler job table does not exist: " + sourceSchema + "." + jobTable);
        }
        String sql = """
                SELECT job_id, title, industry, company, salary, location,
                       experience, level, employment_type, quantity, deadline,
                       skills::text, job_description, requirements, benefits,
                       url, query, crawled_at_utc, to_jsonb(j)::text AS raw_json
                FROM %s.%s j
                """.formatted(sourceSchema, jobTable);
        return jdbcTemplate.query(sql, this::mapRawJob);
    }

    private RawCompany mapRawCompany(ResultSet resultSet, int rowNumber) throws SQLException {
        return new RawCompany(
                resultSet.getString("company_id"),
                resultSet.getString("company_name"),
                resultSet.getString("normalized_name"),
                resultSet.getString("website"),
                resultSet.getString("domain"),
                resultSet.getString("industry"),
                resultSet.getString("company_size"),
                resultSet.getString("headquarters"),
                resultSet.getString("locations"),
                resultSet.getString("description"),
                resultSet.getString("products_services"),
                resultSet.getString("tech_stack"),
                resultSet.getString("culture"),
                resultSet.getString("benefits"),
                resultSet.getString("career_page"),
                resultSet.getString("source"),
                resultSet.getString("source_url"),
                resultSet.getString("logo_url"),
                resultSet.getObject("crawled_at_utc", OffsetDateTime.class),
                resultSet.getString("raw_json"));
    }

    private RawJob mapRawJob(ResultSet resultSet, int rowNumber) throws SQLException {
        return new RawJob(
                resultSet.getString("job_id"),
                resultSet.getString("title"),
                resultSet.getString("industry"),
                resultSet.getString("company"),
                resultSet.getString("salary"),
                resultSet.getString("location"),
                resultSet.getString("experience"),
                resultSet.getString("level"),
                resultSet.getString("employment_type"),
                (Integer) resultSet.getObject("quantity"),
                resultSet.getObject("deadline", OffsetDateTime.class),
                resultSet.getString("skills"),
                resultSet.getString("job_description"),
                resultSet.getString("requirements"),
                resultSet.getString("benefits"),
                resultSet.getString("url"),
                resultSet.getString("query"),
                resultSet.getObject("crawled_at_utc", OffsetDateTime.class),
                resultSet.getString("raw_json"));
    }

    private MapSqlParameterSource companyParameters(RawCompany raw) {
        String source = canonicalSource(raw.source());
        String normalizedName = firstNonBlank(raw.normalizedName(), normalizeKey(raw.companyName()));
        String contentHash = hashValues(
                raw.companyName(), normalizedName, raw.website(), raw.domain(),
                raw.industry(), raw.companySize(), raw.headquarters(), raw.locations(),
                raw.description(), raw.productsServices(), raw.techStack(), raw.culture(),
                raw.benefits(), raw.careerPage(), raw.sourceUrl(), raw.logoUrl());

        return new MapSqlParameterSource()
                .addValue("name", truncate(raw.companyName(), 255))
                .addValue("slug", stableSlug(raw.companyName(), source, raw.companyId(), "company"))
                .addValue("logoUrl", raw.logoUrl())
                .addValue("website", truncate(raw.website(), 255))
                .addValue("size", truncate(raw.companySize(), 50))
                .addValue("description", raw.description())
                .addValue("culture", raw.culture())
                .addValue("benefits", raw.benefits())
                .addValue("externalId", raw.companyId())
                .addValue("source", source)
                .addValue("normalizedName", normalizedName)
                .addValue("domain", raw.domain())
                .addValue("industry", raw.industry())
                .addValue("headquarters", raw.headquarters())
                .addValue("locations", jsonArrayOrEmpty(raw.locations()))
                .addValue("productsServices", raw.productsServices())
                .addValue("techStack", jsonArrayOrEmpty(raw.techStack()))
                .addValue("careerPage", raw.careerPage())
                .addValue("sourceUrl", raw.sourceUrl())
                .addValue("crawledAt", raw.crawledAt())
                .addValue("rawData", jsonObjectOrEmpty(raw.rawJson()))
                .addValue("contentHash", contentHash);
    }

    private List<MapSqlParameterSource> buildPlaceholderCompanies(List<RawJob> rawJobs,
                                                                   Map<String, Long> companyLookup) {
        Map<String, String> missing = new LinkedHashMap<>();
        for (RawJob rawJob : rawJobs) {
            String key = normalizeKey(rawJob.company());
            if (!key.isBlank() && !companyLookup.containsKey(key)) {
                missing.putIfAbsent(key, rawJob.company().trim());
            }
        }

        List<MapSqlParameterSource> placeholders = new ArrayList<>(missing.size());
        for (Map.Entry<String, String> entry : missing.entrySet()) {
            String externalId = "company-name:" + sha256(entry.getKey()).substring(0, 24);
            String rawData = json(Map.of(
                    "inferred", true,
                    "inferred_from", "crawler.jobs.company",
                    "company_name", entry.getValue()));
            placeholders.add(new MapSqlParameterSource()
                    .addValue("name", truncate(entry.getValue(), 255))
                    .addValue("slug", stableSlug(entry.getValue(), PLACEHOLDER_SOURCE, externalId, "company"))
                    .addValue("logoUrl", null)
                    .addValue("website", null)
                    .addValue("size", null)
                    .addValue("description", null)
                    .addValue("culture", null)
                    .addValue("benefits", null)
                    .addValue("externalId", externalId)
                    .addValue("source", PLACEHOLDER_SOURCE)
                    .addValue("normalizedName", entry.getKey())
                    .addValue("domain", null)
                    .addValue("industry", null)
                    .addValue("headquarters", null)
                    .addValue("locations", "[]")
                    .addValue("productsServices", null)
                    .addValue("techStack", "[]")
                    .addValue("careerPage", null)
                    .addValue("sourceUrl", null)
                    .addValue("crawledAt", null)
                    .addValue("rawData", rawData)
                    .addValue("contentHash", hashValues(entry.getValue(), entry.getKey())));
        }
        return placeholders;
    }

    private Map<String, Long> loadCompanyLookup() {
        Map<String, Long> lookup = new LinkedHashMap<>();
        jdbcTemplate.query("""
                SELECT id, name, normalized_name
                FROM public.companies
                WHERE is_deleted IS NOT TRUE
                ORDER BY CASE WHEN source = 'crawler_job' THEN 1 ELSE 0 END, id
                """, resultSet -> {
            Long id = resultSet.getLong("id");
            String normalizedName = normalizeKey(resultSet.getString("normalized_name"));
            String name = normalizeKey(resultSet.getString("name"));
            if (!normalizedName.isBlank()) lookup.putIfAbsent(normalizedName, id);
            if (!name.isBlank()) lookup.putIfAbsent(name, id);
        });
        return lookup;
    }

    private MapSqlParameterSource jobParameters(RawJob raw, Map<String, Long> companyLookup) {
        String source = canonicalSource(defaultSource);
        String companyKey = normalizeKey(raw.company());
        Long companyId = companyLookup.get(companyKey);
        SalaryRange salary = parseSalary(raw.salary());
        LocalDateTime expiredAt = toLocalDateTime(raw.deadline());
        String status = expiredAt != null && expiredAt.isBefore(LocalDateTime.now())
                ? "CLOSED"
                : "PUBLISHED";
        String contentHash = hashValues(
                raw.title(), raw.industry(), raw.company(), raw.salary(), raw.location(),
                raw.experience(), raw.level(), raw.employmentType(), raw.quantity(),
                raw.deadline(), raw.skills(), raw.description(), raw.requirements(),
                raw.benefits(), raw.url(), raw.query());

        return new MapSqlParameterSource()
                .addValue("companyId", companyId)
                .addValue("title", truncate(raw.title(), 255))
                .addValue("slug", stableSlug(raw.title(), source, raw.jobId(), "job"))
                .addValue("jobType", normalizeJobType(raw.employmentType()))
                .addValue("jobLevel", normalizeEnum(raw.level(), 50))
                .addValue("experienceYears", truncate(raw.experience(), 50))
                .addValue("salaryMin", salary.minimum())
                .addValue("salaryMax", salary.maximum())
                .addValue("currency", salary.currency())
                .addValue("locationCity", locationCity(raw.location()))
                .addValue("locationAddress", raw.location())
                .addValue("description", raw.description())
                .addValue("requirements", raw.requirements())
                .addValue("benefits", raw.benefits())
                .addValue("status", status)
                .addValue("expiredAt", expiredAt)
                .addValue("externalId", raw.jobId())
                .addValue("source", source)
                .addValue("industry", raw.industry())
                .addValue("salaryRaw", raw.salary())
                .addValue("locationRaw", raw.location())
                .addValue("quantity", raw.quantity())
                .addValue("skills", jsonArrayOrEmpty(raw.skills()))
                .addValue("sourceUrl", raw.url())
                .addValue("crawlerQuery", raw.query())
                .addValue("crawledAt", raw.crawledAt())
                .addValue("rawData", jsonObjectOrEmpty(raw.rawJson()))
                .addValue("contentHash", contentHash);
    }

    private int executeBatch(String sql, List<MapSqlParameterSource> parameters) {
        if (parameters.isEmpty()) return 0;
        int[] counts = namedJdbcTemplate.batchUpdate(sql, parameters.toArray(MapSqlParameterSource[]::new));
        int changed = 0;
        for (int count : counts) {
            if (count > 0 || count == java.sql.Statement.SUCCESS_NO_INFO) changed++;
        }
        return changed;
    }

    private void markRunCompleted(NormalizationResult result) {
        jdbcTemplate.update("""
                UPDATE public.crawler_normalization_runs
                SET status = 'COMPLETED', completed_at = NOW(), company_rows = ?,
                    company_upserts = ?, job_rows = ?, job_upserts = ?,
                    placeholder_companies = ?
                WHERE id = ?
                """, result.companyRows(), result.companyUpserts(), result.jobRows(),
                result.jobUpserts(), result.placeholderCompanies(), result.runId());
    }

    private void markRunFailed(Long runId, RuntimeException exception) {
        if (runId == null) return;
        String message = truncate(exception.getMessage(), 2000);
        jdbcTemplate.update("""
                UPDATE public.crawler_normalization_runs
                SET status = 'FAILED', completed_at = NOW(), error_message = ?
                WHERE id = ?
                """, message, runId);
    }

    private boolean tableExists(String schema, String table) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = ? AND table_name = ?
                )
                """, Boolean.class, schema, table);
        return Boolean.TRUE.equals(exists);
    }

    private void validateConfiguration() {
        validateIdentifier(sourceSchema);
        validateIdentifier(companyTable);
        validateIdentifier(jobTable);
    }

    private static void validateIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Invalid SQL identifier: " + identifier);
        }
    }

    static SalaryRange parseSalary(String rawSalary) {
        if (rawSalary == null || rawSalary.isBlank()) {
            return new SalaryRange(null, null, "VND");
        }

        String normalized = normalizeKey(rawSalary);
        String currency = normalized.contains("usd") || rawSalary.contains("$")
                ? "USD"
                : "VND";
        List<BigDecimal> values = new ArrayList<>();
        Matcher matcher = NUMBER_PATTERN.matcher(rawSalary);
        while (matcher.find()) {
            BigDecimal parsed = parseNumberToken(matcher.group());
            if (parsed != null) values.add(parsed);
        }
        if (values.isEmpty()) return new SalaryRange(null, null, currency);

        BigDecimal highest = values.stream().max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
        BigDecimal multiplier = BigDecimal.ONE;
        if ((normalized.contains("trieu") || normalized.contains("million"))
                && highest.compareTo(BigDecimal.valueOf(100_000)) < 0) {
            multiplier = BigDecimal.valueOf(1_000_000);
        } else if ((normalized.contains("ty") || normalized.contains("billion"))
                && highest.compareTo(BigDecimal.valueOf(100_000)) < 0) {
            multiplier = BigDecimal.valueOf(1_000_000_000);
        } else if ((normalized.contains("nghin") || normalized.contains("ngan")
                || normalized.matches(".*\\b\\d+(?:[.,]\\d+)?k\\b.*"))
                && highest.compareTo(BigDecimal.valueOf(1_000_000)) < 0) {
            multiplier = BigDecimal.valueOf(1_000);
        }

        BigDecimal salaryMultiplier = multiplier;
        List<BigDecimal> scaled = values.stream()
                .map(value -> value.multiply(salaryMultiplier).setScale(2, RoundingMode.HALF_UP))
                .toList();
        BigDecimal minimum = scaled.stream().min(BigDecimal::compareTo).orElse(null);
        BigDecimal maximum = scaled.stream().max(BigDecimal::compareTo).orElse(null);
        return new SalaryRange(minimum, maximum, currency);
    }

    private static BigDecimal parseNumberToken(String token) {
        try {
            String compact = token.replace(" ", "");
            if (compact.matches("\\d{1,3}([.,]\\d{3})+")) {
                return new BigDecimal(compact.replace(".", "").replace(",", ""));
            }
            int lastDot = compact.lastIndexOf('.');
            int lastComma = compact.lastIndexOf(',');
            if (lastDot >= 0 && lastComma >= 0) {
                int decimalIndex = Math.max(lastDot, lastComma);
                String integerPart = compact.substring(0, decimalIndex).replace(".", "").replace(",", "");
                String decimalPart = compact.substring(decimalIndex + 1);
                return new BigDecimal(integerPart + "." + decimalPart);
            }
            return new BigDecimal(compact.replace(',', '.'));
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String normalizeJobType(String value) {
        String normalized = normalizeKey(value);
        if (normalized.isBlank()) return null;
        if (normalized.contains("toan thoi gian") || normalized.contains("full time")) return "FULL_TIME";
        if (normalized.contains("ban thoi gian") || normalized.contains("part time")) return "PART_TIME";
        if (normalized.contains("thuc tap") || normalized.contains("intern")) return "INTERNSHIP";
        if (normalized.contains("tu do") || normalized.contains("freelance")) return "FREELANCE";
        if (normalized.contains("remote") || normalized.contains("tu xa")) return "REMOTE";
        return normalizeEnum(value, 50);
    }

    private static String normalizeEnum(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String normalized = normalizeKey(value).toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", "_")
                .replaceAll("^_+|_+$", "");
        return truncate(normalized, maxLength);
    }

    private static String locationCity(String location) {
        if (location == null || location.isBlank()) return null;
        String first = location.split("[,;|]", 2)[0].trim();
        return truncate(first, 100);
    }

    private String canonicalSource(String source) {
        String fallback = firstNonBlank(defaultSource, "crawler");
        String value = firstNonBlank(source, fallback).trim().toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]+", "-")
                .replaceAll("^-+|-+$", "");
        return truncate(value.isBlank() ? "crawler" : value, 64);
    }

    private static String stableSlug(String label, String source, String externalId, String fallback) {
        String base = normalizeKey(label)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (base.isBlank()) base = fallback;
        String suffix = sha256(source + "\u0000" + externalId).substring(0, 12);
        int maxBaseLength = 255 - suffix.length() - 1;
        base = truncate(base, maxBaseLength).replaceAll("-+$", "");
        return base + "-" + suffix;
    }

    private String json(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Cannot serialize crawler metadata", exception);
        }
    }

    private static String jsonArrayOrEmpty(String value) {
        return value == null || value.isBlank() ? "[]" : value;
    }

    private static String jsonObjectOrEmpty(String value) {
        return value == null || value.isBlank() ? "{}" : value;
    }

    private static LocalDateTime toLocalDateTime(OffsetDateTime value) {
        return value == null ? null : value.atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
    }

    private static String hashValues(Object... values) {
        String serialized = String.join("\u001f", Arrays.stream(values)
                .map(value -> value == null ? "" : value.toString().trim())
                .toList());
        return sha256(serialized);
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available", exception);
        }
    }

    private static String normalizeKey(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd');
        return normalized.replaceAll("\\p{M}+", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String firstNonBlank(String first, String second) {
        return first != null && !first.isBlank() ? first : second;
    }

    private static String truncate(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) return value;
        return value.substring(0, maxLength);
    }

    private record RawCompany(
            String companyId,
            String companyName,
            String normalizedName,
            String website,
            String domain,
            String industry,
            String companySize,
            String headquarters,
            String locations,
            String description,
            String productsServices,
            String techStack,
            String culture,
            String benefits,
            String careerPage,
            String source,
            String sourceUrl,
            String logoUrl,
            OffsetDateTime crawledAt,
            String rawJson) {
    }

    private record RawJob(
            String jobId,
            String title,
            String industry,
            String company,
            String salary,
            String location,
            String experience,
            String level,
            String employmentType,
            Integer quantity,
            OffsetDateTime deadline,
            String skills,
            String description,
            String requirements,
            String benefits,
            String url,
            String query,
            OffsetDateTime crawledAt,
            String rawJson) {
    }

    record SalaryRange(BigDecimal minimum, BigDecimal maximum, String currency) {
    }

    public record NormalizationResult(
            long runId,
            int companyRows,
            int companyUpserts,
            int jobRows,
            int jobUpserts,
            int placeholderCompanies,
            boolean alreadyRunning) {

        static NormalizationResult skippedBecauseRunning() {
            return new NormalizationResult(-1, 0, 0, 0, 0, 0, true);
        }
    }
}
