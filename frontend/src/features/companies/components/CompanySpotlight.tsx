import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import styles from "../CompaniesPage.module.css";
import type { CompanyItem } from "../companyMapping";

const ROTATE_MS = 5000;

const shorten = (text: string) => (text.length > 170 ? `${text.slice(0, 167).trimEnd()}...` : text);

/** Thẻ "nhà tuyển dụng nổi bật" tự chuyển giữa vài công ty đầu danh sách. */
export default function CompanySpotlight({ companies }: { companies: CompanyItem[] }) {
   const [index, setIndex] = useState(0);
   const [paused, setPaused] = useState(false);

   useEffect(() => {
      if (paused || companies.length <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const interval = setInterval(() => setIndex((current) => (current + 1) % companies.length), ROTATE_MS);
      return () => clearInterval(interval);
   }, [paused, companies.length]);

   useEffect(() => {
      setIndex((current) => (companies.length ? current % companies.length : 0));
   }, [companies.length]);

   const company = companies.length ? companies[index % companies.length] : null;

   return (
      <article className={styles.spotlightCard} aria-label="Doanh nghiệp nổi bật">
         {company && <img src={company.image} alt="" />}
         <div className={styles.spotlightOverlay} />
         <div className={styles.spotlightContent}>
            <span className={styles.spotlightLabel}>
               <ShieldCheck aria-hidden="true" /> Nhà tuyển dụng nổi bật
            </span>
            <h2>{company?.name || "Đang tải doanh nghiệp"}</h2>
            <p>{company ? shorten(company.description) : "Đang tải dữ liệu doanh nghiệp từ hệ thống..."}</p>
            <div className={styles.bannerControls}>
               <div className={styles.bannerDots} aria-label="Chọn doanh nghiệp nổi bật">
                  {companies.map((item, itemIndex) => (
                     <button
                        key={item.slug}
                        type="button"
                        onClick={() => setIndex(itemIndex)}
                        className={itemIndex === index ? styles.bannerDotActive : styles.bannerDot}
                        aria-label={`Xem doanh nghiệp nổi bật ${itemIndex + 1}`}
                        aria-current={itemIndex === index ? "true" : undefined}
                     />
                  ))}
               </div>
               <button
                  type="button"
                  className={styles.carouselToggle}
                  onClick={() => setPaused((current) => !current)}
                  aria-label={paused ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu"}
               >
                  <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
               </button>
            </div>
         </div>
      </article>
   );
}
