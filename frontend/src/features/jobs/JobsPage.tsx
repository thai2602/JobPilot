'use client';

import { useRouter } from "next/navigation";
import { AlertTriangle, Briefcase, CheckCircle2, Info } from "lucide-react";
import ApplyCvModal from "../../components/ApplyCvModal";
import { generateSlug } from "../../utils/slug";
import CareerArticles from "./components/CareerArticles";
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

   const isInitialLoad = loading && jobs.length === 0;
   // API xếp tin còn hạn lên trước, nên trang đầu toàn tin hết hạn nghĩa là không còn tin nào mở
   const onlyExpired = jobs.length > 0 && jobs.every((job) => job.expired);

   const scrollToResults = () =>
      document.getElementById("job-results")?.scrollIntoView({ behavior: "smooth", block: "start" });

   return (
      // Chừa chỗ dưới cùng cho nút chat / yêu thích nổi ở góc phải
      <div className="space-y-8 pb-28">
         {toast && (
            <div role={toast.kind === "error" ? "alert" : "status"} className={`fixed bottom-6 right-6 z-[2000] px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up border transition-all ${toast.kind === "success"
               ? "bg-slate-900 border-slate-800 text-white"
               : "bg-rose-50 border-rose-100 text-rose-800"
               }`}>
               <CheckCircle2 className={`w-5 h-5 shrink-0 ${toast.kind === "success" ? "text-emerald-400" : "text-rose-500"}`} />
               <span className="text-[13.5px] font-bold">{toast.message}</span>
            </div>
         )}

         <JobSearchHero
            searchTerm={filters.search}
            onSearchChange={(search) => updateFilters({ search })}
            onSubmit={scrollToResults}
         />

         <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
            <JobFiltersPanel
               filters={filters}
               onChange={updateFilters}
               onClear={clearFilters}
               hasActiveFilters={hasActiveFilters}
            />

            <main id="job-results" className="space-y-4 scroll-mt-28">
               <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-5 py-3.5 shadow-sm">
                  <p className="text-[13.5px] font-bold text-slate-600" role="status" aria-live="polite">
                     {isInitialLoad
                        ? "Đang tải việc làm..."
                        : <>Đang hiển thị <span className="text-slate-900 font-extrabold">{jobs.length}</span> vị trí</>}
                  </p>
                  {hasActiveFilters && (
                     <span className="text-[12px] font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                        Đang lọc
                     </span>
                  )}
               </div>

               {onlyExpired && !error && (
                  <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
                     <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                     <p className="text-[13.5px] text-amber-900 leading-relaxed">
                        <span className="font-bold">Hiện chưa có tin còn hạn nộp hồ sơ.</span>{" "}
                        Các tin dưới đây đã hết hạn, được giữ lại để bạn tham khảo mức lương và yêu cầu công việc.
                     </p>
                  </div>
               )}

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
                     <div className="text-center py-16 bg-white border border-slate-100 rounded-3xl space-y-4">
                        <Briefcase className="w-14 h-14 text-slate-300 mx-auto" aria-hidden="true" />
                        <h3 className="text-lg font-extrabold text-slate-800">Không tìm thấy công việc phù hợp</h3>
                        <p className="text-slate-600 text-sm max-w-sm mx-auto leading-relaxed">
                           Thử từ khoá khác hoặc bỏ bớt điều kiện lọc.
                        </p>
                        {hasActiveFilters && (
                           <button
                              onClick={clearFilters}
                              className="px-5 py-2.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl text-[13px] font-bold transition-all active:scale-95 cursor-pointer"
                           >
                              Xóa bộ lọc
                           </button>
                        )}
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
                     <div className="text-center py-4">
                        <button
                           onClick={loadMore}
                           className="px-8 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[14px] rounded-xl active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                           Xem thêm công việc
                        </button>
                     </div>
                  )}
                  {loading && (
                     <div className="text-center py-4 text-slate-600 font-bold text-sm animate-pulse">
                        Đang tải công việc...
                     </div>
                  )}
                  {!loading && !hasMore && jobs.length > 0 && (
                     <p className="text-center py-4 text-slate-500 font-bold text-[12px]">
                        Đã tải hết danh sách
                     </p>
                  )}
               </div>
            </main>
         </div>

         <CareerArticles />

         <ApplyCvModal
            isOpen={actions.applyingJob !== null}
            onClose={actions.cancelApplication}
            onConfirm={actions.confirmApplication}
         />
      </div>
   );
}
