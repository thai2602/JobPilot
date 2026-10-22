import type React from "react";
import { Bookmark, CheckCircle2, Clock3, Flame, MapPin, Wallet } from "lucide-react";
import { API_URL } from "../../../config/env";
import { imageSrc } from "../../companies/companyAssets";
import type { Job } from "../jobMapping";

/** Logo từ API có thể là URL tuyệt đối hoặc đường dẫn tương đối tới backend. */
const getLogoUrl = (image: Job["image"]): string => {
   if (!image) return "";
   if (typeof image !== "string") return imageSrc(image);
   if (/^(https?:|data:)/.test(image)) return image;
   return `${API_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

/** Logo công ty; không có ảnh thật thì hiện chữ cái đầu tên công ty. */
function CompanyLogo({ job }: { job: Job }) {
   const src = typeof job.image === "string" ? getLogoUrl(job.image) : "";
   const initial = job.company.trim().charAt(0).toUpperCase() || "?";
   return (
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
         {src ? (
            <img
               src={src}
               className="w-full h-full object-contain p-2"
               alt=""
               onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
         ) : (
            <span className="text-xl font-black" style={{ color: job.companyColor }} aria-hidden="true">{initial}</span>
         )}
      </div>
   );
}

type Props = {
   job: Job;
   saved: boolean;
   saving: boolean;
   applied: boolean;
   onOpen: () => void;
   onToggleSaved: () => void;
   onApply: () => void;
};

const metaChip = "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-700 border border-slate-200/70 text-[12px] font-semibold";

export default function JobCard({ job, saved, saving, applied, onOpen, onToggleSaved, onApply }: Props) {
   // Các nút nằm trong thẻ có thể bấm được, nên không để click lan lên mở trang chi tiết
   const stop = (action: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
   };
   const { expired } = job;

   return (
      <article
         onClick={onOpen}
         className={`group relative border rounded-[24px] p-5 sm:p-6 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center ${expired
            ? "bg-slate-50/60 border-slate-200 hover:border-slate-300"
            : "bg-white border-slate-100 shadow-sm hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5"
            }`}
         style={expired ? undefined : { borderLeft: `5px solid ${job.companyColor}` }}
      >
         <div className={expired ? "opacity-60 grayscale" : ""}>
            <CompanyLogo job={job} />
         </div>

         <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
               <span className="text-[13px] font-semibold text-slate-600">{job.company}</span>
               {job.hot && !expired && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-bold">
                     <Flame className="w-3 h-3 text-amber-500" aria-hidden="true" /> Hot
                  </span>
               )}
               {expired && (
                  <span className="whitespace-nowrap inline-flex items-center px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 text-[11px] font-bold">
                     Đã hết hạn
                  </span>
               )}
            </div>
            <h3 className={`text-lg font-black leading-snug transition-colors truncate ${expired ? "text-slate-600" : "text-slate-900 group-hover:text-emerald-800"}`}>
               {job.title}
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
               <span className={metaChip}><MapPin className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> {job.place}</span>
               <span className={metaChip}><Wallet className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> {job.salary}</span>
               <span className={metaChip}><Clock3 className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" /> {job.type}</span>
               {job.tags.slice(0, 2).map((tag) => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 rounded-xl bg-white text-slate-600 border border-slate-200 text-[12px] font-medium">
                     {tag}
                  </span>
               ))}
            </div>
         </div>

         <div className="w-full sm:w-auto shrink-0 flex sm:flex-col gap-2.5 items-center sm:items-end justify-between border-t border-slate-100 sm:border-t-0 pt-4 sm:pt-0">
            <span className={`text-[12px] font-semibold ${expired ? "text-slate-600" : "text-slate-500"}`}>{job.posted}</span>
            <div className="flex items-center gap-2">
               <button
                  type="button"
                  onClick={stop(onToggleSaved)}
                  disabled={saving}
                  aria-pressed={saved}
                  aria-label={saved ? `Bỏ lưu ${job.title}` : `Lưu ${job.title}`}
                  className={`p-3 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-60 ${saved
                     ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm"
                     : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300"
                     }`}
                  title={saved ? "Bỏ lưu tin" : "Lưu tin tuyển dụng"}
               >
                  <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
               </button>
               {applied ? (
                  <span className="px-5 py-3 bg-slate-100 text-slate-600 font-extrabold text-[13.5px] rounded-xl border border-slate-200 inline-flex items-center gap-1.5">
                     <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" /> Đã ứng tuyển
                  </span>
               ) : expired ? (
                  // Tin hết hạn không nhận hồ sơ; vẫn cho xem chi tiết để tham khảo
                  <button
                     type="button"
                     onClick={stop(onOpen)}
                     className="px-5 py-3 bg-white text-slate-700 font-extrabold text-[13.5px] rounded-xl border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                     Xem chi tiết
                  </button>
               ) : (
                  <button
                     type="button"
                     onClick={stop(onApply)}
                     className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[13.5px] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                     Ứng tuyển
                  </button>
               )}
            </div>
         </div>
      </article>
   );
}
