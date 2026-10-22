package com.jobportal.modules.company;

import java.util.List;

/**
 * Một trang danh bạ công ty kèm số lượng cho từng lựa chọn lọc. Số lượng của mỗi chiều
 * được đếm với các bộ lọc còn lại, nên người dùng biết trước chọn mục nào sẽ ra bao nhiêu kết quả.
 */
public record CompanyDirectoryResponse(
        List<CompanyResponse> items,
        long total,
        int offset,
        int limit,
        Facets facets) {

    public record Facets(
            List<Option> industries,
            List<Option> sizes,
            List<Option> regions,
            long hiring) {
    }

    public record Option(String value, String label, long count) {
    }
}
