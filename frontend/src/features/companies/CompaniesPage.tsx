'use client';

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUpRight, Building2, CheckCircle2, SlidersHorizontal, X } from "lucide-react";
import { companiesApi, type CompanySort } from "../../services/companiesApi";
import styles from "./CompaniesPage.module.css";
import CompaniesHero from "./components/CompaniesHero";
import CompanyCard from "./components/CompanyCard";
import CompanyFiltersPanel from "./components/CompanyFiltersPanel";
import {
   emptyCompanyFilters,
   filtersFromSearch,
   filtersToSearch,
   useCompanyDirectory,
   type CompanyFilters,
} from "./useCompanyDirectory";

const sortLabels: Record<CompanySort, string> = {
   featured: "Nổi bật",
   recent: "Mới cập nhật",
   name: "Tên A–Z",
};

type HeroStats = { companies: number; hiring: number; fields: number };

export default function CompaniesPage() {
   // null cho tới khi đọc xong URL, để không tải trang đầu hai lần
   const [filters, setFilters] = useState<CompanyFilters | null>(null);
   const [searchTerm, setSearchTerm] = useState("");
   const { companies, total, facets, loading, hasMore, loadMore, error, retry } = useCompanyDirectory(filters);
   const [heroStats, setHeroStats] = useState<HeroStats | null>(null);
   const directoryRef = useRef<HTMLElement>(null);

   useEffect(() => {
      const initial = filtersFromSearch(window.location.search);
      setFilters(initial);
      setSearchTerm(initial.search);
   }, []);

   // Giữ bộ lọc trên URL để chia sẻ link hoặc quay lại trang vẫn đúng kết quả
   useEffect(() => {
      if (!filters) return;
      const next = `${window.location.pathname}${filtersToSearch(filters)}`;
      if (next !== `${window.location.pathname}${window.location.search}`) {
         window.history.replaceState(window.history.state, "", next);
      }
   }, [filters]);

   // Số liệu ở hero là của toàn bộ danh bạ, không phụ thuộc bộ lọc đang chọn
   useEffect(() => {
      companiesApi.directory({ limit: 1 })
         .then((data) => setHeroStats({ companies: data.total, hiring: data.facets.hiring, fields: data.facets.industries.length }))
         .catch(() => setHeroStats(null));
   }, []);

   const activeCount = filters
      ? [filters.search, filters.industry, filters.size, filters.region, filters.hiring].filter(Boolean).length
      : 0;

   const updateFilters = (patch: Partial<CompanyFilters>) => {
      setFilters((current) => ({ ...(current ?? emptyCompanyFilters), ...patch }));
   };

   const runSearch = (query: string) => {
      updateFilters({ search: query.trim() });
      directoryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
   };

   const clearFilters = () => {
      setSearchTerm("");
      setFilters((current) => ({ ...emptyCompanyFilters, sort: current?.sort ?? "featured" }));
   };

   const labelOf = (options: { value: string; label: string }[] | undefined, value: string) =>
      options?.find((option) => option.value === value)?.label ?? value;

   const activeChips: { key: string; label: string; remove: () => void }[] = [];
   if (filters?.search) activeChips.push({ key: "search", label: `“${filters.search}”`, remove: () => { setSearchTerm(""); updateFilters({ search: "" }); } });
   if (filters?.hiring) activeChips.push({ key: "hiring", label: "Đang tuyển", remove: () => updateFilters({ hiring: false }) });
   if (filters?.region) activeChips.push({ key: "region", label: labelOf(facets?.regions, filters.region), remove: () => updateFilters({ region: null }) });
   if (filters?.size) activeChips.push({ key: "size", label: labelOf(facets?.sizes, filters.size), remove: () => updateFilters({ size: null }) });
   if (filters?.industry) activeChips.push({ key: "industry", label: filters.industry, remove: () => updateFilters({ industry: null }) });

   const isInitialLoading = loading && companies.length === 0;
   const isRefreshing = loading && companies.length > 0;

   return (
      <div className={styles.page}>
         <CompaniesHero
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onSearch={runSearch}
            stats={heroStats ?? { companies: 0, hiring: 0, fields: 0 }}
            spotlight={companies.slice(0, 3)}
         />

         <section ref={directoryRef} id="company-directory" className={styles.directory} aria-labelledby="company-directory-title">
            <header className={styles.directoryHeader}>
               <div>
                  <span className={styles.sectionEyebrow}>Danh bạ doanh nghiệp</span>
                  <h2 id="company-directory-title">Khám phá công ty phù hợp</h2>
                  <p role="status" aria-live="polite">
                     {isInitialLoading
                        ? "Đang tải danh sách doanh nghiệp..."
                        : error
                           ? "Chưa tải được danh sách."
                           : `Tìm thấy ${total.toLocaleString("vi-VN")} doanh nghiệp${activeCount ? " phù hợp bộ lọc" : ""}.`}
                  </p>
               </div>
               <label className={styles.sortControl}>
                  <SlidersHorizontal aria-hidden="true" />
                  <span>Sắp xếp</span>
                  <select
                     value={filters?.sort ?? "featured"}
                     onChange={(event) => updateFilters({ sort: event.target.value as CompanySort })}
                  >
                     {(Object.keys(sortLabels) as CompanySort[]).map((sort) => (
                        <option key={sort} value={sort}>{sortLabels[sort]}</option>
                     ))}
                  </select>
               </label>
            </header>

            <div className="mt-5 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
               <CompanyFiltersPanel
                  filters={filters ?? emptyCompanyFilters}
                  facets={facets}
                  onChange={updateFilters}
                  onClear={clearFilters}
                  activeCount={activeCount}
               />

               <div className="min-w-0">
                  {activeChips.length > 0 && (
                     <ul className="flex flex-wrap items-center gap-2" aria-label="Bộ lọc đang áp dụng">
                        {activeChips.map((chip) => (
                           <li key={chip.key}>
                              <button
                                 type="button"
                                 onClick={chip.remove}
                                 className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                                 aria-label={`Bỏ lọc ${chip.label}`}
                              >
                                 <span className="truncate">{chip.label}</span>
                                 <X className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              </button>
                           </li>
                        ))}
                     </ul>
                  )}

                  {error && (
                     <div role="alert" className={styles.emptyState}>
                        <div><AlertTriangle aria-hidden="true" /></div>
                        <h3>Không tải được danh sách công ty</h3>
                        <p>{error}</p>
                        <button type="button" onClick={retry}>Thử lại</button>
                     </div>
                  )}

                  <div
                     className={`${styles.companyGrid} transition-opacity ${isRefreshing ? "opacity-60" : ""}`}
                     aria-busy={loading}
                  >
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

                     {!isInitialLoading && companies.map((company, index) => (
                        <CompanyCard key={company.slug} company={company} eager={index < 2} />
                     ))}
                  </div>

                  {!loading && !error && companies.length === 0 && (
                     <div className={styles.emptyState}>
                        <div><Building2 aria-hidden="true" /></div>
                        <h3>Chưa tìm thấy công ty phù hợp</h3>
                        <p>Thử bỏ bớt bộ lọc hoặc tìm bằng một từ khóa khác.</p>
                        <button type="button" onClick={clearFilters}>Xóa bộ lọc</button>
                     </div>
                  )}

                  {!isInitialLoading && !error && hasMore && (
                     <div className={styles.loadMoreWrap}>
                        <button type="button" onClick={loadMore} disabled={loading} className={styles.loadMoreButton}>
                           {loading ? "Đang tải doanh nghiệp..." : `Xem thêm công ty (${companies.length}/${total})`}
                           {!loading && <ArrowUpRight aria-hidden="true" />}
                        </button>
                     </div>
                  )}

                  {!hasMore && !error && companies.length > 0 && (
                     <div className={styles.endState}>
                        <CheckCircle2 aria-hidden="true" /> Bạn đã xem hết {total} doanh nghiệp phù hợp
                     </div>
                  )}
               </div>
            </div>
         </section>
      </div>
   );
}
