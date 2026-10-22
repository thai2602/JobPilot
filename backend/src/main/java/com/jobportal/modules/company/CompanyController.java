package com.jobportal.modules.company;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    public List<CompanyResponse> getAllCompanies(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "false") boolean completeOnly) {
        return companyService.listCompanies(offset, limit, search, completeOnly);
    }

    /** Danh bạ có lọc theo ngành, quy mô, khu vực, đang tuyển; trả kèm tổng số và số lượng từng lựa chọn. */
    @GetMapping("/directory")
    public CompanyDirectoryResponse getDirectory(
            @RequestParam(defaultValue = "0") int offset,
            @RequestParam(defaultValue = "12") int limit,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String industry,
            @RequestParam(required = false) String size,
            @RequestParam(required = false) String region,
            @RequestParam(defaultValue = "false") boolean hiring,
            @RequestParam(required = false) String sort) {
        return companyService.getDirectory(
                CompanyFilter.of(search, industry, size, region, hiring, sort), offset, limit);
    }

    @GetMapping("/{slug}")
    public CompanyResponse getCompanyBySlug(@PathVariable String slug) {
        return companyService.getCompanyBySlug(slug);
    }
}
