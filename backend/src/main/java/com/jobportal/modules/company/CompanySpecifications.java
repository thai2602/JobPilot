package com.jobportal.modules.company;

import com.jobportal.modules.job.Job;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/** Điều kiện lọc danh bạ công ty, ghép từ {@link CompanyFilter}. */
final class CompanySpecifications {

    private CompanySpecifications() {
    }

    static Specification<Company> matching(CompanyFilter filter, LocalDateTime now) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.or(cb.isFalse(root.get("isDeleted")), cb.isNull(root.get("isDeleted"))));
            for (String field : List.of("description", "industry", "headquarters", "size")) {
                predicates.add(cb.notEqual(cb.trim(cb.coalesce(root.get(field), "")), ""));
            }

            if (filter.search() != null) {
                String pattern = "%" + filter.search().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("industry")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)));
            }
            if (filter.industry() != null) {
                Expression<String> padded = cb.concat(cb.concat(" ", cb.trim(root.get("industry"))), " ");
                predicates.add(cb.like(padded, CompanyIndustries.likePattern(filter.industry())));
            }
            filter.sizeGroup().ifPresent(group -> predicates.add(root.get("size").in(group.sizes())));
            filter.region().ifPresent(region -> predicates.add(regionPredicate(region, root, cb)));
            if (filter.hiringOnly()) {
                predicates.add(cb.exists(openJobs(root, query.subquery(Long.class), cb, now)));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }

    private static Predicate regionPredicate(CompanyRegion region, Root<Company> root, CriteriaBuilder cb) {
        Expression<String> address = cb.lower(root.get("headquarters"));
        if (region != CompanyRegion.OTHER) {
            return matchesAny(region.keywords(), address, cb);
        }
        Predicate inKnownRegion = matchesAny(
                Arrays.stream(CompanyRegion.values()).flatMap(known -> known.keywords().stream()).toList(),
                address,
                cb);
        return cb.not(inKnownRegion);
    }

    private static Predicate matchesAny(List<String> keywords, Expression<String> address, CriteriaBuilder cb) {
        return cb.or(keywords.stream()
                .map(keyword -> cb.like(address, "%" + keyword + "%"))
                .toArray(Predicate[]::new));
    }

    private static Subquery<Long> openJobs(Root<Company> company, Subquery<Long> subquery, CriteriaBuilder cb, LocalDateTime now) {
        Root<Job> job = subquery.from(Job.class);
        return subquery.select(job.get("id")).where(
                cb.equal(job.get("company"), company),
                cb.or(cb.isFalse(job.get("isDeleted")), cb.isNull(job.get("isDeleted"))),
                cb.equal(job.get("status"), "PUBLISHED"),
                cb.or(cb.isNull(job.get("expiredAt")), cb.greaterThan(job.get("expiredAt"), now)));
    }
}
