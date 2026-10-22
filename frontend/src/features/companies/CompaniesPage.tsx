'use client';

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, SlidersHorizontal } from "lucide-react";
import styles from "./CompaniesPage.module.css";
import CompaniesHero from "./components/CompaniesHero";
import CompanyCard from "./components/CompanyCard";
import { fieldLabels } from "./companyMapping";
import { useCompanyDirectory } from "./useCompanyDirectory";

const ALL_FIELDS = "Tất cả";
type SortMode = "featured" | "jobs" | "name";

export default function CompaniesPage() {
   const { companies, search, loading, hasMore, loadMore, error, retry } = useCompanyDirectory();
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedField, setSelectedField] = useState(ALL_FIELDS);
   const [sortMode, setSortMode] = useState<SortMode>("featured");

   const runSearch = (query: string) => {
      setSelectedField(ALL_FIELDS);
      search(query);
      document.getElementById("company-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
   };

   const fields = Array.from(new Set(companies.map((company) => company.field)));
   const visibleCompanies = companies
      .filter((company) => selectedField === ALL_FIELDS || company.field === selectedField)
      .sort((left, right) => {
         if (sortMode === "jobs") return right.openJobs - left.openJobs || right.totalJobs - left.totalJobs;
         if (sortMode === "name") return left.name.localeCompare(right.name, "vi");
         return 0;
      });
   const totalOpenJobs = companies.reduce((total, company) => total + company.openJobs, 0);
   const isInitialLoading = loading && companies.length === 0;

   const resetFilters = () => {
      setSearchTerm("");
      setSortMode("featured");
      runSearch("");
   };

   return (
      <div className={styles.page}>
         <CompaniesHero
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={runSearch}
            stats={{ companies: companies.length, openJobs: totalOpenJobs, fields: fields.length }}
            spotlight={companies.slice(0, 3)}
         />

         <section id="company-directory" className={styles.directory} aria-labelledby="company-directory-title">
            <header className={styles.directoryHeader}>
               <div>
                  <span className={styles.sectionEyebrow}>Danh bạ doanh nghiệp</span>
                  <h2 id="company-directory-title">Khám phá công ty phù hợp</h2>
                  <p role="status" aria-live="polite">
                     {isInitialLoading
                        ? "Đang chuẩn bị danh sách doanh nghiệp..."
                        : `${visibleCompanies.length} doanh nghiệp phù hợp với lựa chọn hiện tại.`}
                  </p>
               </div>
               <label className={styles.sortControl}>
                  <SlidersHorizontal aria-hidden="true" />
                  <span>Sắp xếp</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                     <option value="featured">Nổi bật</option>
                     <option value="jobs">Nhiều vị trí nhất</option>
                     <option value="name">Tên A–Z</option>
                  </select>
               </label>
            </header>

            <div className={styles.filterBar} role="group" aria-label="Lọc công ty theo lĩnh vực">
               {[ALL_FIELDS, ...fields].map((field) => (
                  <button
                     key={field}
                     type="button"
                     onClick={() => setSelectedField(field)}
                     className={field === selectedField ? styles.industryFilterActive : styles.industryFilter}
                     aria-pressed={field === selectedField}
                  >
                     {fieldLabels[field] ?? field}
                  </button>
               ))}
            </div>

            {error && (
               <div role="alert" className={styles.emptyState}>
                  <div><AlertTriangle aria-hidden="true" /></div>
                  <h3>Không tải được danh sách công ty</h3>
                  <p>{error}</p>
                  <button type="button" onClick={retry}>Thử lại</button>
               </div>
            )}

            <div className={styles.companyGrid}>
               {isInitialLoading && [0, 1, 2, 3].map((item) => (
                  <div key={item} className={styles.skeletonCard} aria-hidden="true">
                     <div className={styles.skeletonImage} />
                     <div className={styles.skeletonBody}>
                        <span />
                        <span />
                        <span />
                     </div>
                  </div>
               ))}

               {!isInitialLoading && visibleCompanies.map((company, index) => (
                  <CompanyCard key={company.slug} company={company} eager={index < 2} />
               ))}
            </div>

            {!isInitialLoading && !error && visibleCompanies.length === 0 && (
               <div className={styles.emptyState}>
                  <div><Building2 aria-hidden="true" /></div>
                  <h3>Chưa tìm thấy công ty phù hợp</h3>
                  <p>{hasMore ? "Chưa thấy trong danh sách đã tải. Bạn có thể xem thêm công ty hoặc xóa bộ lọc." : "Thử một từ khóa khác hoặc quay lại xem toàn bộ danh bạ doanh nghiệp."}</p>
                  <button type="button" onClick={resetFilters}>Xóa bộ lọc</button>
               </div>
            )}

            {!isInitialLoading && !error && hasMore && (
               <div className={styles.loadMoreWrap}>
                  <button type="button" onClick={loadMore} disabled={loading} className={styles.loadMoreButton}>
                     {loading ? "Đang tải doanh nghiệp..." : visibleCompanies.length === 0 ? "Tìm trong các công ty tiếp theo" : "Xem thêm công ty"}
                     {!loading && <ArrowUpRight aria-hidden="true" />}
                  </button>
               </div>
            )}

            {!hasMore && !error && visibleCompanies.length > 0 && (
               <div className={styles.endState}>
                  <CheckCircle2 aria-hidden="true" /> Bạn đã xem hết danh sách công ty hiện có
               </div>
            )}
         </section>
      </div>
   );
}
