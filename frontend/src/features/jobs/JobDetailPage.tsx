'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
   ArrowLeft, MapPin, Wallet, Clock3, Bookmark,
   Building2, ExternalLink, Flame, CalendarClock,
   Briefcase, Star, ChevronRight,
} from "lucide-react";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { generateSlug } from "../../utils/slug";
import { readAuthUser } from "../../utils/auth";
import { hasCreatedCv } from "../../utils/cv";
import ApplyCvModal from "../../components/ApplyCvModal";
import { companyJobs } from "./JobsPage";
import image1 from "../../assets/company_logo/image_1.png";
import image2 from "../../assets/company_logo/image_2.png";
import image3 from "../../assets/company_logo/image_3.png";
import { jobsApi } from "../../services/jobsApi";
import { applicationsApi } from "../../services/applicationsApi";
import { savedJobsApi } from "../../services/savedJobsApi";

type JobDetail = {
   id?: number;
   title: string;
   company: string;
   companyColor: string;
   companyDescription: string;
   description: string;
   requirements?: string;
   benefits?: string;
   place: string;
   field: string;
   type: string;
   salary: string;
   tags: string[];
   hot?: boolean;
   posted?: string;
   image?: any;
   companyUrl?: string;
   slug?: string;
   jobLevel?: string;
   experienceYears?: any;
   expiredAt?: string;
   locationAddress?: string;
   [key: string]: any;
};

const fallbackImages = [image1, image2, image3];

export default function JobDetailPage() {
   const router = useRouter();
   const params = useParams();
   const jobSlug = (params?.jobSlug as string) || "";

   const [job, setJob] = useState<JobDetail | null>(null);
   const [relatedJobs, setRelatedJobs] = useState<JobDetail[]>([]);
   const [activeTab, setActiveTab] = useState<"description" | "requirements" | "benefits">("description");
   const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
   const [isSaved, setIsSaved] = useState(false);
   const [isApplied, setIsApplied] = useState(false);
   const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

   useEffect(() => {
      if (!job && jobSlug) {
         jobsApi.getBySlug(jobSlug)
            .then((data) => {
               if (!data) {
                  const fallback = companyJobs.find((j) => {
                     const s = j.slug || generateSlug(`${j.company}-${j.title}`);
                     return s === jobSlug;
                  });
                  if (fallback) {
                     setJob({
                        ...fallback,
                        companyDescription: fallback.companyDescription || "",
                        requirements: fallback.requirements || "",
                        benefits: fallback.benefits || "",
                     });
                  }
               } else {
                  const levelMap: Record<string, string> = { FRESHER: "Fresher", JUNIOR: "Junior", SENIOR: "Senior", LEADER: "Leader", DIRECTOR: "Giám đốc" };
                  setJob({
                     id: data.id,
                     title: data.title,
                     company: data.company?.name ?? "",
                     companyColor: data.company?.color ?? "#0ea5e9",
                     companyDescription: data.company?.description ?? "",
                     description: data.description ?? "",
                     requirements: data.requirements ?? "",
                     benefits: data.benefits ?? "",
                     place: data.locationCity ?? "Việt Nam",
                     locationAddress: data.locationAddress ?? "",
                     field: "Nhóm ngành khác",
                     type: data.jobType === "FULL_TIME" ? "Full-time" : data.jobType === "REMOTE" ? "Remote" : "Hybrid",
                     salary: `${Math.round((data.salaryMin ?? 0) / 1_000_000)}–${Math.round((data.salaryMax ?? 0) / 1_000_000)} triệu`,
                     tags: [
                        data.jobLevel ? (levelMap[data.jobLevel] ?? data.jobLevel) : null,
                        data.experienceYears ? `${data.experienceYears} năm KN` : null,
                        data.locationCity || null,
                     ].filter((t): t is string => Boolean(t)),
                     hot: false,
                     posted: "Vừa cập nhật",
                     image: data.company?.logoUrl || fallbackImages[0],
                     companyUrl: `/cong-ty/${data.company?.slug ?? ""}`,
                     slug: data.slug,
                     jobLevel: data.jobLevel,
                     experienceYears: data.experienceYears,
                     expiredAt: data.expiredAt,
                  });
               }
            })
            .catch(() => {
               const fallback = companyJobs.find((j) => {
                  const s = j.slug || generateSlug(`${j.company}-${j.title}`);
                  return s === jobSlug;
               });
               if (fallback) {
                  setJob({
                     ...fallback,
                     companyDescription: fallback.companyDescription || "",
                     requirements: fallback.requirements || "",
                     benefits: fallback.benefits || "",
                  });
               }
            });
      }
   }, [job, jobSlug]);

   useEffect(() => {
      if (relatedJobs.length > 0 || !job) return;
      jobsApi.list()
         .then((data) => {
            const related = data
               .filter((j) => j.slug !== jobSlug)
               .slice(0, 3)
               .map((j, i) => ({
                  title: j.title,
                  company: j.company?.name ?? "",
                  companyColor: j.company?.color ?? "#0ea5e9",
                  companyDescription: j.company?.description ?? "",
                  description: j.description ?? "",
                  place: j.locationCity ?? "",
                  field: "Nhóm ngành khác",
                  type: j.jobType === "FULL_TIME" ? "Full-time" : j.jobType === "REMOTE" ? "Remote" : "Hybrid",
                  salary: `${Math.round((j.salaryMin ?? 0) / 1_000_000)}–${Math.round((j.salaryMax ?? 0) / 1_000_000)} triệu`,
                  tags: [],
                  hot: false,
                  posted: "Vừa cập nhật",
                  image: fallbackImages[i % fallbackImages.length],
                  companyUrl: "/cong-ty",
                  slug: j.slug,
               }));
            setRelatedJobs(related);
         })
         .catch(() => {});
   }, [job, jobSlug, relatedJobs.length]);

   useEffect(() => {
      if (!job) return;
      const savedRaw = localStorage.getItem("jobpilot_saved_jobs");
      const appliedRaw = localStorage.getItem("jobpilot_applications");
      const saved: any[] = savedRaw ? (JSON.parse(savedRaw) ?? []).filter(Boolean) : [];
      const applied: any[] = appliedRaw ? (JSON.parse(appliedRaw) ?? []).filter(Boolean) : [];
      setIsSaved(saved.some((s) => s && s.title === job.title && s.company === job.company));
      setIsApplied(applied.some((a) => a && a.title === job.title && a.company === job.company));
   }, [job]);

   const showToast = (message: string, kind: "success" | "error" = "success") => {
      setToast({ message, kind });
      setTimeout(() => setToast(null), 2600);
   };

   const handleApply = () => {
      if (!readAuthUser()) { showToast("Bạn cần đăng nhập trước khi ứng tuyển.", "error"); return; }
      if (!hasCreatedCv()) { showToast("Bạn chưa có CV. Vui lòng tạo CV trước.", "error"); return; }
      if (isApplied) { showToast("Bạn đã ứng tuyển vị trí này rồi.", "error"); return; }
      setIsApplyModalOpen(true);
   };

   const handleConfirmApply = async (cvId: number) => {
      setIsApplyModalOpen(false);
      let finalId = `${job!.company}-${job!.title}-${Date.now()}`;
      if (job!.id) {
         try {
            const data = await applicationsApi.create({ jobId: job!.id, cvId });
            finalId = `api-${data.id}`;
         } catch (err) {
            console.error("Lỗi gửi application lên API:", err);
            showToast(
               err instanceof Error ? `Không thể ứng tuyển: ${err.message}` : "Không thể ứng tuyển trên máy chủ.",
               "error",
            );
            return;
         }
      }

      const application = {
         id: finalId,
         jobId: job!.id,
         company: job!.company,
         title: job!.title,
         salary: job!.salary,
         place: job!.place,
         appliedAt: new Date().toLocaleString("vi-VN"),
         status: "Đang chờ xác nhận",
         trackingNote: "Hồ sơ đã được gửi lên hệ thống và đang chờ phản hồi.",
         cvId,
      };

      try {
         const raw = localStorage.getItem("jobpilot_applications");
         const current = raw ? JSON.parse(raw) : [];
         const updated = [application, ...(Array.isArray(current) ? current : [])];
         localStorage.setItem("jobpilot_applications", JSON.stringify(updated));
         window.dispatchEvent(new Event("jobpilot-data-updated"));
         setIsApplied(true);
         showToast("Ứng tuyển thành công! Hồ sơ của bạn đã được ghi nhận.");
      } catch {
         showToast("Không thể lưu ứng tuyển vào trình duyệt.", "error");
      }
   };

   const handleToggleSave = async () => {
      if (!job) return;
      const raw = localStorage.getItem("jobpilot_saved_jobs");
      const current: any[] = raw ? (JSON.parse(raw) ?? []).filter(Boolean) : [];
      const shouldSyncWithServer = Boolean(job.id && readAuthUser());

      if (isSaved) {
         if (shouldSyncWithServer) {
            try {
               const serverSavedJobs = await savedJobsApi.listMine();
               const serverItem = serverSavedJobs.find((item) => item.job?.id === job.id);
               if (serverItem) {
                  await savedJobsApi.remove(serverItem.id);
               }
            } catch (err) {
               console.error("Lỗi xóa việc làm đã lưu trên API:", err);
               showToast(
                  err instanceof Error ? `Không thể xóa việc làm đã lưu: ${err.message}` : "Không thể xóa việc làm đã lưu trên máy chủ.",
                  "error",
               );
               return;
            }
         }

         const updated = current.filter((s) => !(s.title === job.title && s.company === job.company));
         localStorage.setItem("jobpilot_saved_jobs", JSON.stringify(updated));
         setIsSaved(false);
         showToast("Đã xóa khỏi danh sách việc làm đã lưu.");
      } else {
         let savedRecordId: number | undefined;
         if (shouldSyncWithServer) {
            try {
               const saved = await savedJobsApi.create(job.id!);
               savedRecordId = saved.id;
            } catch (err) {
               console.error("Lỗi lưu việc làm trên API:", err);
               showToast(
                  err instanceof Error ? `Không thể lưu việc làm: ${err.message}` : "Không thể lưu việc làm trên máy chủ.",
                  "error",
               );
               return;
            }
         }

         const newItem = {
            id: savedRecordId ? `api-saved-${savedRecordId}` : (job.slug || `${job.company}-${job.title}`),
            jobId: job.id,
            title: job.title,
            company: job.company,
            place: job.place,
            salary: job.salary,
            savedAt: new Date().toLocaleString("vi-VN"),
         };
         localStorage.setItem("jobpilot_saved_jobs", JSON.stringify([newItem, ...current]));
         setIsSaved(true);
         showToast("Đã lưu việc làm thành công!");
      }
      window.dispatchEvent(new Event("jobpilot-data-updated"));
   };

   if (!job) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <p className="text-slate-500 font-medium">Đang tải thông tin việc làm...</p>
            <Link href="/tim-viec" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
               <ArrowLeft className="w-4 h-4" /> Quay lại danh sách việc làm
            </Link>
         </div>
      );
   }

   return (
      <div className="space-y-8 max-w-[1100px] mx-auto">
         {/* Breadcrumb */}
         <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/tim-viec" className="hover:text-emerald-600 transition-colors">Tìm việc</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold truncate max-w-[200px]">{toVietnameseJobTitle(job.title)}</span>
         </nav>

         {/* Header Card */}
         <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
               <div className="flex items-start gap-4 flex-1">
                  <div className="w-16 h-16 rounded-2xl border border-slate-100 flex items-center justify-center bg-slate-50 p-2 shrink-0">
                     <Building2 className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                     <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
                           {toVietnameseJobTitle(job.title)}
                        </h1>
                        {job.hot && (
                           <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                              <Flame className="w-3 h-3 text-amber-500 fill-amber-500" /> Hot
                           </span>
                        )}
                     </div>
                     <p className="text-sm font-bold text-slate-600 flex items-center gap-2">
                        <span>{job.company}</span>
                        {job.companyUrl && (
                           <Link href={job.companyUrl} className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 text-xs">
                              Xem công ty <ExternalLink className="w-3 h-3" />
                           </Link>
                        )}
                     </p>
                  </div>
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3 w-full md:w-auto">
                  <button
                     onClick={handleToggleSave}
                     className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                     }`}
                     title={isSaved ? "Bỏ lưu" : "Lưu việc làm"}
                  >
                     <Bookmark className={`w-5 h-5 ${isSaved ? "fill-rose-500" : ""}`} />
                  </button>
                  <button
                     onClick={handleApply}
                     disabled={isApplied}
                     className={`flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-extrabold text-white transition-all shadow-md cursor-pointer ${
                        isApplied ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-emerald-600/20"
                     }`}
                  >
                     {isApplied ? "Đã ứng tuyển" : "Ứng tuyển ngay"}
                  </button>
               </div>
            </div>

            {/* Quick Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100">
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mức lương</p>
                  <p className="text-sm font-extrabold text-emerald-600 flex items-center gap-1.5">
                     <Wallet className="w-4 h-4 text-emerald-500" /> {job.salary}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Địa điểm</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                     <MapPin className="w-4 h-4 text-slate-400" /> {job.place}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hình thức</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                     <Clock3 className="w-4 h-4 text-slate-400" /> {job.type}
                  </p>
               </div>
               <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngày đăng</p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                     <CalendarClock className="w-4 h-4 text-slate-400" /> {job.posted || "Vừa cập nhật"}
                  </p>
               </div>
            </div>
         </div>

         {/* Content Tabs */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
               <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm space-y-6">
                  {/* Tab Navigation */}
                  <div className="flex border-b border-slate-100 gap-6">
                     {[
                        { id: "description", label: "Mô tả công việc" },
                        { id: "requirements", label: "Yêu cầu ứng viên" },
                        { id: "benefits", label: "Quyền lợi" },
                     ].map((tab) => (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id as any)}
                           className={`pb-3 text-sm font-bold transition-all border-b-2 cursor-pointer ${
                              activeTab === tab.id
                                 ? "border-emerald-600 text-emerald-600"
                                 : "border-transparent text-slate-400 hover:text-slate-600"
                           }`}
                        >
                           {tab.label}
                        </button>
                     ))}
                  </div>

                  {/* Tab Content */}
                  <div className="text-sm text-slate-700 leading-relaxed font-medium">
                     {activeTab === "description" && (
                        <div className="prose prose-slate max-w-none space-y-4">
                           <p className="whitespace-pre-line">{job.description || "Chưa có mô tả chi tiết."}</p>
                        </div>
                     )}
                     {activeTab === "requirements" && (
                        <div className="prose prose-slate max-w-none space-y-4">
                           <p className="whitespace-pre-line">{job.requirements || "Yêu cầu phù hợp theo mô tả vị trí công việc."}</p>
                        </div>
                     )}
                     {activeTab === "benefits" && (
                        <div className="prose prose-slate max-w-none space-y-4">
                           <p className="whitespace-pre-line">{job.benefits || "Được hưởng đầy đủ các chế độ bảo hiểm và đãi ngộ hấp dẫn."}</p>
                        </div>
                     )}
                  </div>
               </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
               {/* Company Info Box */}
               <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Giới thiệu công ty</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                     {job.companyDescription || "Công ty hàng đầu trong lĩnh vực với môi trường làm việc chuyên nghiệp, năng động."}
                  </p>
               </div>

               {/* Related Jobs */}
               {relatedJobs.length > 0 && (
                  <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
                     <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Việc làm liên quan</h3>
                     <div className="space-y-3">
                        {relatedJobs.map((rj) => (
                           <Link
                              key={rj.slug || rj.title}
                              href={`/tim-viec/${rj.slug || generateSlug(`${rj.company}-${rj.title}`)}`}
                              className="block p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all group"
                           >
                              <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">{toVietnameseJobTitle(rj.title)}</p>
                              <p className="text-[11px] text-slate-500 font-medium">{rj.company}</p>
                              <p className="text-[11px] font-bold text-emerald-600 mt-1">{rj.salary}</p>
                           </Link>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Toast Notification */}
         {toast && (
            <div className="fixed bottom-6 right-6 z-50 animate-bounce">
               <div className={`px-5 py-3 rounded-2xl shadow-xl text-xs font-bold text-white ${toast.kind === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
                  {toast.message}
               </div>
            </div>
         )}

         {/* Apply Modal */}
         <ApplyCvModal
            isOpen={isApplyModalOpen}
            onClose={() => setIsApplyModalOpen(false)}
            onConfirm={handleConfirmApply}
         />
      </div>
   );
}
