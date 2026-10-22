package com.jobportal.modules.company;

import org.springframework.data.domain.Sort;

import java.util.Optional;

/**
 * Bộ lọc danh bạ công ty. Giá trị rỗng hoặc không hợp lệ được bỏ qua thay vì báo lỗi,
 * để URL cũ hoặc gõ tay vẫn mở được trang.
 */
public record CompanyFilter(
        String search,
        String industry,
        Optional<CompanySizeGroup> sizeGroup,
        Optional<CompanyRegion> region,
        boolean hiringOnly,
        SortMode sort) {

    public enum SortMode {
        FEATURED(Sort.by(Sort.Order.desc("isFeatured").nullsLast(), Sort.Order.desc("updatedAt").nullsLast(), Sort.Order.desc("id"))),
        NAME(Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id"))),
        RECENT(Sort.by(Sort.Order.desc("updatedAt").nullsLast(), Sort.Order.desc("id")));

        private final Sort sort;

        SortMode(Sort sort) {
            this.sort = sort;
        }

        public Sort sort() {
            return sort;
        }

        static SortMode parse(String value) {
            for (SortMode mode : values()) {
                if (mode.name().equalsIgnoreCase(value)) {
                    return mode;
                }
            }
            return FEATURED;
        }
    }

    public static CompanyFilter of(String search, String industry, String size, String region, boolean hiringOnly, String sort) {
        return new CompanyFilter(
                blankToNull(search),
                blankToNull(industry),
                CompanySizeGroup.parse(size),
                CompanyRegion.parse(region),
                hiringOnly,
                SortMode.parse(sort));
    }

    /** Cùng điều kiện nhưng bỏ một chiều lọc, dùng để đếm số lượng cho từng lựa chọn của chiều đó. */
    CompanyFilter withoutIndustry() {
        return new CompanyFilter(search, null, sizeGroup, region, hiringOnly, sort);
    }

    CompanyFilter withSize(CompanySizeGroup group) {
        return new CompanyFilter(search, industry, Optional.ofNullable(group), region, hiringOnly, sort);
    }

    CompanyFilter withRegion(CompanyRegion value) {
        return new CompanyFilter(search, industry, sizeGroup, Optional.ofNullable(value), hiringOnly, sort);
    }

    CompanyFilter withHiringOnly(boolean value) {
        return new CompanyFilter(search, industry, sizeGroup, region, value, sort);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
