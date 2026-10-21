import Link from "next/link";
import { ArrowUpRight, Briefcase, MapPin, Users } from "lucide-react";
import styles from "../CompaniesPage.module.css";
import { fieldColors, fieldLabels, type CompanyItem } from "../companyMapping";

const defaultTone = { bg: "#f1f5f9", text: "#475569" };

export default function CompanyCard({ company, eager }: { company: CompanyItem; eager: boolean }) {
   const tone = fieldColors[company.field] ?? defaultTone;

   return (
      <Link href={`/cong-ty/${company.slug}`} className={styles.companyCard}>
         <article>
            <div className={styles.companyVisual}>
               <img
                  src={company.image}
                  alt={`Hình minh họa môi trường làm việc của ${company.name}`}
                  loading={eager ? "eager" : "lazy"}
               />
               <div className={styles.companyVisualShade} />
               <span className={styles.fieldBadge} style={{ background: tone.bg, color: tone.text }}>
                  {fieldLabels[company.field] ?? company.field}
               </span>
            </div>

            <div className={styles.companyBody}>
               <div className={styles.companyIdentity}>
                  <div className={styles.companyLogo}>
                     <img src={company.logo} alt={`${company.name} logo`} />
                  </div>
                  <div>
                     <div className={styles.companyNameRow}>
                        <h3>{company.name}</h3>
                     </div>
                     <p><MapPin aria-hidden="true" /> {company.location}</p>
                  </div>
               </div>

               <p className={styles.companyDescription}>{company.description}</p>

               <div className={styles.companyMeta}>
                  <span><Users aria-hidden="true" /> {company.employees}</span>
                  <span><Briefcase aria-hidden="true" /> {company.openJobs} vị trí</span>
               </div>

               <div className={styles.benefitList} aria-label="Phúc lợi nổi bật">
                  {company.benefits.slice(0, 2).map((benefit) => (
                     <span key={benefit}>{benefit}</span>
                  ))}
               </div>

               <footer className={styles.companyFooter}>
                  <span className={styles.openingCount} style={{ color: company.color, background: `${company.color}12` }}>
                     {company.openJobs > 0 ? `${company.openJobs} cơ hội đang chờ bạn` : "Xem hồ sơ doanh nghiệp"}
                  </span>
                  <span className={styles.cardAction}>
                     Khám phá <ArrowUpRight aria-hidden="true" />
                  </span>
               </footer>
            </div>
         </article>
      </Link>
   );
}
