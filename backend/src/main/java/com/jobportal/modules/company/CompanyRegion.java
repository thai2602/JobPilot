package com.jobportal.modules.company;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Khu vực suy ra từ địa chỉ trụ sở (văn bản tự do). Mỗi khu vực khớp theo tên tỉnh thành
 * và các quận đặc trưng, vì nhiều địa chỉ chỉ ghi quận mà không ghi thành phố. Công ty có
 * văn phòng ở nhiều nơi khớp nhiều khu vực. Không dùng tên quận trùng tên đường phổ biến
 * ở thành phố khác (ví dụ "Hai Bà Trưng" cũng là đường ở TP.HCM).
 * {@link #OTHER} là các địa chỉ không khớp khu vực nào ở trên.
 */
public enum CompanyRegion {
    HA_NOI("Hà Nội", List.of(
            "hà nội", "ha noi", "hanoi", "cầu giấy", "ba đình", "đống đa", "hoàn kiếm",
            "thanh xuân", "long biên", "hoàng mai", "tây hồ", "từ liêm", "hà đông", "gia lâm")),
    HO_CHI_MINH("TP. Hồ Chí Minh", List.of(
            "hồ chí minh", "ho chi minh", "hcm", "sài gòn", "thủ đức", "bình thạnh", "tân bình", "phú nhuận",
            "gò vấp", "tân phú", "bình tân", "quận 1", "quận 2", "quận 3", "quận 4", "quận 5", "quận 6",
            "quận 7", "quận 8", "quận 9")),
    DA_NANG("Đà Nẵng", List.of("đà nẵng", "da nang", "hải châu", "sơn trà", "ngũ hành sơn", "liên chiểu")),
    OTHER("Tỉnh thành khác", List.of());

    private final String label;
    private final List<String> keywords;

    CompanyRegion(String label, List<String> keywords) {
        this.label = label;
        this.keywords = keywords;
    }

    public String label() {
        return label;
    }

    public List<String> keywords() {
        return keywords;
    }

    public static Optional<CompanyRegion> parse(String value) {
        return Arrays.stream(values()).filter(region -> region.name().equalsIgnoreCase(value)).findFirst();
    }
}
