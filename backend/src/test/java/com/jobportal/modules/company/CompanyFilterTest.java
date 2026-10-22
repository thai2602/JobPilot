package com.jobportal.modules.company;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CompanyFilterTest {

    @Test
    void parsesKnownValuesCaseInsensitively() {
        CompanyFilter filter = CompanyFilter.of("  acme ", "IT - Phần mềm", "large", "ha_noi", true, "name");

        assertThat(filter.search()).isEqualTo("acme");
        assertThat(filter.industry()).isEqualTo("IT - Phần mềm");
        assertThat(filter.sizeGroup()).contains(CompanySizeGroup.LARGE);
        assertThat(filter.region()).contains(CompanyRegion.HA_NOI);
        assertThat(filter.hiringOnly()).isTrue();
        assertThat(filter.sort()).isEqualTo(CompanyFilter.SortMode.NAME);
    }

    @Test
    void ignoresBlankAndUnknownValues() {
        CompanyFilter filter = CompanyFilter.of(" ", "", "huge", "mars", false, "random");

        assertThat(filter.search()).isNull();
        assertThat(filter.industry()).isNull();
        assertThat(filter.sizeGroup()).isEmpty();
        assertThat(filter.region()).isEmpty();
        assertThat(filter.sort()).isEqualTo(CompanyFilter.SortMode.FEATURED);
    }

    @Test
    void groupsCrawlerSizeValues() {
        assertThat(CompanySizeGroup.of("25-99 nhân viên")).contains(CompanySizeGroup.SMALL);
        assertThat(CompanySizeGroup.of("500-1000 nhân viên")).contains(CompanySizeGroup.MEDIUM);
        assertThat(CompanySizeGroup.of("10000+ nhân viên")).contains(CompanySizeGroup.LARGE);
        assertThat(CompanySizeGroup.of("không rõ")).isEmpty();
    }

    @Test
    void splitsConcatenatedIndustriesOnWordBoundaries() {
        assertThat(CompanyIndustries.split("Sản xuất Xuất nhập khẩu Logistics - Vận tải"))
                .containsExactlyInAnyOrder("Sản xuất", "Xuất nhập khẩu", "Logistics - Vận tải");
        // "Khách sạn" không được tính là ngành "Khác"
        assertThat(CompanyIndustries.split("Nhà hàng / Khách sạn")).containsExactly("Nhà hàng / Khách sạn");
        assertThat(CompanyIndustries.split("Marketing / Truyền thông / Quảng cáo Khác"))
                .containsExactlyInAnyOrder("Marketing / Truyền thông / Quảng cáo", "Khác");
        assertThat(CompanyIndustries.split(" ")).isEmpty();
    }
}
