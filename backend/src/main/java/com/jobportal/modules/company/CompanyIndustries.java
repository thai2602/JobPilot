package com.jobportal.modules.company;

import java.util.List;

/**
 * Danh mục ngành chuẩn. Crawler ghi {@code companies.industry} bằng cách nối nhiều ngành bằng dấu cách
 * (ví dụ "Sản xuất Xuất nhập khẩu Logistics - Vận tải"), nên bộ lọc so khớp từng ngành chuẩn
 * theo ranh giới từ thay vì so bằng cả chuỗi.
 */
final class CompanyIndustries {

    static final List<String> CANONICAL = List.of(
            "Giáo dục / Đào tạo",
            "Bất động sản",
            "Bán lẻ - Hàng tiêu dùng - FMCG",
            "Dược phẩm / Y tế / Công nghệ sinh học",
            "Sản xuất",
            "Xây dựng",
            "Nhà hàng / Khách sạn",
            "IT - Phần mềm",
            "IT - Phần cứng",
            "Công nghệ thông tin",
            "Logistics - Vận tải",
            "Luật",
            "Marketing / Truyền thông / Quảng cáo",
            "Kế toán / Kiểm toán",
            "Thiết kế / kiến trúc",
            "Viễn thông",
            "Ngân hàng",
            "Tài chính",
            "Chứng khoán",
            "Bảo hiểm",
            "Môi trường",
            "Năng lượng",
            "Cơ quan nhà nước",
            "Thương mại điện tử",
            "Thương mại tổng hợp",
            "Tư vấn",
            "Nông Lâm Ngư nghiệp",
            "Du lịch",
            "Giải trí",
            "Xuất nhập khẩu",
            "Thời trang",
            "Điện tử / Điện lạnh",
            "Nhân sự",
            "In ấn / Xuất bản",
            "Cơ khí",
            "Tự động hóa",
            "Internet / Online",
            "Agency (Marketing/Advertising)",
            "Agency (Design/Development)",
            "Chăm sóc khách hàng/Vận hành",
            "Khác");

    private CompanyIndustries() {
    }

    /** Các ngành chuẩn có trong một giá trị {@code industry} thô. */
    static List<String> split(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        String padded = " " + raw.trim() + " ";
        return CANONICAL.stream().filter(label -> padded.contains(" " + label + " ")).toList();
    }

    /** Mẫu LIKE khớp ngành theo ranh giới từ, dùng với {@code ' ' || industry || ' '}. */
    static String likePattern(String label) {
        return "% " + label + " %";
    }
}
