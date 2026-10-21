import type React from "react";
import { Bookmark, CheckCircle2, Clock3, Flame, MapPin, Wallet } from "lucide-react";
import { API_URL } from "../../../config/env";
import { companyAvatars, imageSrc } from "../../companies/companyAssets";
import type { Job } from "../jobMapping";

const defaultLogo = imageSrc(companyAvatars[0]);

/** Logo từ API có thể là URL tuyệt đối hoặc đường dẫn tương đối tới backend. */
const getLogoUrl = (image: Job["image"]): string => {
   if (!image) return defaultLogo;
   if (typeof image !== "string") return imageSrc(image);
   if (/^(https?:|data:)/.test(image)) return image;
   return `${API_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

type Props = {
   job: Job;
   saved: boolean;
   saving: boolean;
   applied: boolean;
   onOpen: () => void;
   onToggleSaved: () => void;
   onApply: () => void;
};

export default function JobCard({ job, saved, saving, applied, onOpen, onToggleSaved, onApply }: Props) {
   // Các nút nằm trong thẻ có thể bấm được, nên không để click lan lên mở trang chi tiết
   const stop = (action: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      action();
   };

   return (
      <article
         onClick={onOpen}
         className="group relative bg-white border border-slate-100 rounded-[24px] p-5 sm:p-6 shadow-sm hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center"
         style={{ borderLeft: `5px solid ${job.companyColor}` }}
      >
         <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2.5 shrink-0 transition-all duration-300 group-hover:scale-105 overflow-hidden">
            <img
               src={getLogoUrl(job.image)}
               className="w-full h-full object-contain"
               alt={job.company}
               onError={(e) => { e.currentTarget.src = defaultLogo; }}
            />
         </div>

         <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
               <span className="text-[12px] font-bold text-slate-500 hover:text-slate-900 transition-colors">{job.company}</span>
               {job.hot && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[9.5px] font-extrabold uppercase">
                     <Flame className="w-3 h-3 text-amber-500" /> Hot
                  </span>
               )}
            </div>
            <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors truncate">
               {job.title}
            </h3>

            <div className="flex flex-wrap gap-2 pt-1">
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.place}
               </span>
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                  <Wallet className="w-3.5 h-3.5 text-slate-400" /> {job.salary}
               </span>
               <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                  <Clock3 className="w-3.5 h-3.5 text-slate-400" /> {job.type}
               </span>
               {job.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50/50 text-emerald-700 border border-emerald-100/60 text-[11px] font-extrabold uppercase">
                     {tag}
                  </span>
               ))}
            </div>
         </div>

         <div className="w-full sm:w-auto shrink-0 flex sm:flex-col gap-2.5 items-center sm:items-end justify-between border-t border-slate-50 sm:border-t-0 pt-4 sm:pt-0">
            <span className="text-[11.5px] font-bold text-slate-400">{job.posted}</span>
            <div className="flex items-center gap-2">
               <button
                  type="button"
                  onClick={stop(onToggleSaved)}
                  disabled={saving}
                  aria-pressed={saved}
                  aria-label={saved ? `Bỏ lưu ${job.title}` : `Lưu ${job.title}`}
                  className={`p-3 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-60 ${saved
                     ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm"
                     : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                     }`}
                  title={saved ? "Bỏ lưu tin" : "Lưu tin tuyển dụng"}
               >
                  <Bookmark className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
               </button>
               {applied ? (
                  <button
                     disabled
                     onClick={(e) => e.stopPropagation()}
                     className="px-5 py-3 bg-slate-100 text-slate-500 font-extrabold text-[13.5px] rounded-xl border border-slate-200 cursor-default inline-flex items-center gap-1.5"
                  >
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã ứng tuyển
                  </button>
               ) : (
                  <button
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
