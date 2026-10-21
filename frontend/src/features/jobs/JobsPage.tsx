'use client';

import { useRouter } from "next/navigation";
import { AlertTriangle, Briefcase, CheckCircle2 } from "lucide-react";
import ApplyCvModal from "../../components/ApplyCvModal";
import { generateSlug } from "../../utils/slug";
import CareerArticles from "./components/CareerArticles";
import HiringPromotions, { type PromotionAction } from "./components/HiringPromotions";
import JobCard from "./components/JobCard";
import JobFiltersPanel from "./components/JobFiltersPanel";
import JobSearchHero from "./components/JobSearchHero";
import { useJobActions } from "./useJobActions";
import { useJobsList } from "./useJobsList";

export default function JobsPage() {
   const router = useRouter();
   const { jobs, filters, updateFilters, clearFilters, hasActiveFilters, loading, hasMore, loadMore, error, retry } = useJobsList();
   const actions = useJobActions();
   const { toast } = actions;

   const handlePromotion = (action: PromotionAction) => {
      if (action === "register-fair") {
         actions.showToast("Đăng ký Mega Career Fair thành công! Vé tham dự đã được gửi vào email của bạn.");
         return;
      }
      if (action === "search-it") {
         updateFilters({ search: "React" });
         actions.showToast("Đã lọc các vị trí IT / React Developer nổi bật!");
      } else {
         updateFilters({ jobType: "HYBRID" });
         actions.showToast("Đã lọc các công việc có chính sách Hybrid!");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
   };

   const isInitialLoad = loading && jobs.length === 0;

   return (
      <div className="space-y-10 pb-16">
         {toast && (
            <div className={`fixed bottom-6 right-6 z-[2000] px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up border transition-all ${toast.kind === "success"
               ? "bg-slate-900 border-slate-800 text-white"
               : "bg-rose-50 border-rose-100 text-rose-800"
               }`}>
               <CheckCircle2 className={`w-5 h-5 shrink-0 ${toast.kind === "success" ? "text-emerald-400" : "text-rose-500"}`} />
               <span className="text-[13.5px] font-bold">{toast.message}</span>
            </div>
         )}

         <JobSearchHero searchTerm={filters.search} onSearchChange={(search) => updateFilters({ search })} />

         <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">
            <JobFiltersPanel
               filters={filters}
               onChange={updateFilters}
               onClear={clearFilters}
               hasActiveFilters={hasActiveFilters}
            />

            <main className="space-y-6">
               <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
                  <p className="text-[13.5px] font-bold text-slate-500">
                     Đang hiển thị <span className="text-slate-900 font-extrabold">{jobs.length}</span> vị trí phù hợp
                  </p>
                  {hasActiveFilters && (
                     <span className="text-[12px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
                        Bộ lọc đang hoạt động
                     </span>
                  )}
               </div>

               <div className="flex flex-col gap-4">
                  {error && (
                     <div role="alert" className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-rose-50 border border-rose-100 rounded-2xl px-6 py-5">
                        <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                        <div className="flex-1 space-y-1">
                           <p className="text-[14px] font-extrabold text-rose-800">Không tải được danh sách việc làm</p>
                           <p className="text-[13px] text-rose-700">{error}</p>
                        </div>
                        <button
                           onClick={jobs.length ? loadMore : retry}
                           className="px-5 py-2.5 bg-white text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-[13px] font-bold transition-all active:scale-95 cursor-pointer"
                        >
                           Thử lại
                        </button>
                     </div>
                  )}

                  {!isInitialLoad && !error && jobs.length === 0 && (
                     <div className="text-center py-20 bg-white border border-slate-100 rounded-3xl space-y-4">
                        <Briefcase className="w-16 h-16 text-slate-200 mx-auto" />
                        <h3 className="text-lg font-extrabold text-slate-800">Không tìm thấy công việc phù hợp</h3>
                        <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
                           Hãy thử thay đổi từ khóa tìm kiếm hoặc tắt bớt các điều kiện lọc để tiếp cận nhiều cơ hội việc làm hơn.
                        </p>
                        <button
                           onClick={clearFilters}
                           className="px-5 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[13px] font-bold transition-all active:scale-95 cursor-pointer"
                        >
                           Xóa bộ lọc để thử lại
                        </button>
                     </div>
                  )}

                  {jobs.map((job) => (
                     <JobCard
                        key={job.id ?? `${job.title}-${job.company}`}
                        job={job}
                        saved={actions.isSaved(job)}
                        saving={actions.isSaving(job)}
                        applied={actions.isApplied(job)}
                        onOpen={() => router.push(`/tim-viec/${job.slug ?? generateSlug(`${job.title} ${job.company}`)}`)}
                        onToggleSaved={() => actions.toggleSaved(job)}
                        onApply={() => actions.startApplication(job)}
                     />
                  ))}

                  {!loading && !error && hasMore && jobs.length > 0 && (
                     <div className="text-center py-6">
                        <button
                           onClick={loadMore}
                           className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-[14px] rounded-xl hover:shadow-lg active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                           Xem thêm công việc
                        </button>
                     </div>
                  )}
                  {loading && (
                     <div className="text-center py-4 text-slate-500 font-extrabold text-sm animate-pulse">
                        Đang tải công việc...
                     </div>
                  )}
                  {!loading && !hasMore && jobs.length > 0 && (
                     <div className="text-center py-4 text-slate-400 font-extrabold text-xs uppercase tracking-wider">
                        Đã tải hết tất cả công việc
                     </div>
                  )}
               </div>
            </main>
         </div>

         <HiringPromotions onAction={handlePromotion} />
         <CareerArticles />

         <ApplyCvModal
            isOpen={actions.applyingJob !== null}
            onClose={actions.cancelApplication}
            onConfirm={actions.confirmApplication}
         />
      </div>
   );
}
