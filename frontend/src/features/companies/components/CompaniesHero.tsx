import { ChevronRight, Search, Sparkles, X } from "lucide-react";
import styles from "../CompaniesPage.module.css";
import type { CompanyItem } from "../companyMapping";
import CompanySpotlight from "./CompanySpotlight";

type Props = {
   searchTerm: string;
   onSearchTermChange: (value: string) => void;
   onSearch: (query: string) => void;
   stats: { companies: number; openJobs: number; fields: number };
   spotlight: CompanyItem[];
};

export default function CompaniesHero({ searchTerm, onSearchTermChange, onSearch, stats, spotlight }: Props) {
   return (
      <section className={styles.hero} aria-labelledby="companies-hero-title">
         <div className={styles.heroGlowOne} />
         <div className={styles.heroGlowTwo} />
         <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
               <span className={styles.heroEyebrow}>
                  <Sparkles aria-hidden="true" />
                  Mạng lưới nhà tuyển dụng JobPilot
               </span>
               <h1 id="companies-hero-title" className={styles.heroTitle}>
                  Tìm nơi bạn có thể <span>phát triển lâu dài.</span>
               </h1>
               <p className={styles.heroDescription}>
                  Khám phá văn hóa, môi trường làm việc và những vị trí đang tuyển từ các doanh nghiệp phù hợp với định hướng của bạn.
               </p>

               <form
                  className={styles.heroSearch}
                  role="search"
                  onSubmit={(event) => {
                     event.preventDefault();
                     onSearch(searchTerm);
                  }}
               >
                  <Search aria-hidden="true" className={styles.searchIcon} />
                  <input
                     value={searchTerm}
                     onChange={(event) => onSearchTermChange(event.target.value)}
                     placeholder="Tên công ty, lĩnh vực hoặc địa điểm..."
                     aria-label="Tìm kiếm công ty"
                  />
                  {searchTerm && (
                     <button
                        type="button"
                        className={styles.clearSearch}
                        onClick={() => {
                           onSearchTermChange("");
                           onSearch("");
                        }}
                        aria-label="Xóa nội dung tìm kiếm"
                     >
                        <X aria-hidden="true" />
                     </button>
                  )}
                  <button type="submit" className={styles.searchSubmit}>
                     Tìm công ty
                     <ChevronRight aria-hidden="true" />
                  </button>
               </form>

               <div className={styles.heroStats} aria-label="Thống kê danh bạ công ty">
                  <div>
                     <strong>{stats.companies || "—"}</strong>
                     <span>doanh nghiệp đã tải</span>
                  </div>
                  <div>
                     <strong>{stats.openJobs || "—"}</strong>
                     <span>vị trí đang mở</span>
                  </div>
                  <div>
                     <strong>{stats.fields || "—"}</strong>
                     <span>lĩnh vực nổi bật</span>
                  </div>
               </div>
            </div>

            <CompanySpotlight companies={spotlight} />
         </div>
      </section>
   );
}
