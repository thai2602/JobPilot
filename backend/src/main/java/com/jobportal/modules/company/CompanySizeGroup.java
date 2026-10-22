package com.jobportal.modules.company;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/** Nhóm quy mô dùng cho bộ lọc, gom các giá trị {@code companies.size} do crawler ghi. */
public enum CompanySizeGroup {
    SMALL("Dưới 100 nhân viên", List.of("1-9 nhân viên", "10-24 nhân viên", "25-99 nhân viên")),
    MEDIUM("100 – 1.000 nhân viên", List.of("100-499 nhân viên", "500-1000 nhân viên")),
    LARGE("Trên 1.000 nhân viên", List.of("1000+ nhân viên", "3000+ nhân viên", "5000+ nhân viên", "10000+ nhân viên"));

    private final String label;
    private final List<String> sizes;

    CompanySizeGroup(String label, List<String> sizes) {
        this.label = label;
        this.sizes = sizes;
    }

    public String label() {
        return label;
    }

    public List<String> sizes() {
        return sizes;
    }

    public static Optional<CompanySizeGroup> of(String size) {
        return Arrays.stream(values()).filter(group -> group.sizes.contains(size)).findFirst();
    }

    /** Giá trị từ query string, không phân biệt hoa thường; rỗng hoặc sai thì bỏ qua bộ lọc. */
    public static Optional<CompanySizeGroup> parse(String value) {
        return Arrays.stream(values()).filter(group -> group.name().equalsIgnoreCase(value)).findFirst();
    }
}
