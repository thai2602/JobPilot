'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, MapPin } from "lucide-react";
import { readAuthUser } from "../../utils/auth";
import logoImg from "../../assets/logo/Screenshot_2026-05-07_133557-removebg-preview.png";
import { getApplicationStatusMeta } from "../../utils/application";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { applicationsApi, type ApiApplication } from "../../services/applicationsApi";

type StoredApplication = {
   id?: string;
   title?: string;
   company?: string;
   place?: string;
   field?: string;
   salary?: string;
   type?: string;
   industry?: string;
   appliedAt?: string;
   savedAt?: string;
   status?: string;
   trackingNote?: string;
   description?: string;
   jobId?: number;
   cvId?: number;
};

const statusToneStyles: Record<string, { badge: string; border: string; accent: string; panel: string }> = {
   amber: {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      border: "border-amber-200",
      accent: "bg-amber-500",
      panel: "from-amber-50 via-white to-white",
   },
   sky: {
      badge: "border-sky-200 bg-sky-50 text-sky-700",
      border: "border-sky-200",
      accent: "bg-sky-500",
      panel: "from-sky-50 via-white to-white",
   },
   emerald: {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      border: "border-emerald-200",
      accent: "bg-emerald-500",
      panel: "from-emerald-50 via-white to-white",
   },
   rose: {
      badge: "border-rose-200 bg-rose-50 text-rose-700",
      border: "border-rose-200",
      accent: "bg-rose-500",
      panel: "from-rose-50 via-white to-white",
   },
   slate: {
      badge: "border-gray-200 bg-gray-50 text-gray-700",
      border: "border-gray-200",
      accent: "bg-gray-500",
      panel: "from-slate-50 via-white to-white",
   },
};

const statusMap: Record<string, string> = {
   PENDING: "Đang chờ xác nhận",
   REVIEWING: "Hồ sơ đã tiếp nhận",
   ACCEPTED: "Trúng tuyển",
   REJECTED: "Không phù hợp",
};

const mapApiApplication = (apiApp: ApiApplication): StoredApplication => {
   const job = apiApp.job || {};
   const company = job.company || {};

   const salaryStr = job.salaryMin && job.salaryMax 
      ? `${Math.round(job.salaryMin / 1_000_000)}–${Math.round(job.salaryMax / 1_000_000)} triệu`
      : "Thỏa thuận";

   const jobTypeStr = job.jobType === "FULL_TIME" ? "Full-time" : job.jobType === "REMOTE" ? "Remote" : "Hybrid";

   return {
      id: `api-${apiApp.id}`,
      jobId: job.id,
      cvId: apiApp.cvId,
      title: job.title || "Vị trí chưa xác định",
      company: company.name || "Chưa có công ty",
      place: job.locationCity || "Việt Nam",
      salary: salaryStr,
      type: jobTypeStr,
      appliedAt: apiApp.appliedAt ? new Date(apiApp.appliedAt).toLocaleString("vi-VN") : "",
      status: (apiApp.status ? statusMap[apiApp.status] : undefined) || apiApp.status || "Đang chờ xác nhận",
      trackingNote: apiApp.trackingNote || "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
   };
};

const loadApplications = () => {
   try {
      if (typeof window === "undefined") return [] as StoredApplication[];
      const raw = localStorage.getItem("jobpilot_applications");
      if (!raw) {
         return [] as StoredApplication[];
      }

      const parsed = JSON.parse(raw) as StoredApplication[];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
   } catch {
      return [] as StoredApplication[];
   }
};

export default function AppliedJobsPage() {
   const [currentUser, setCurrentUser] = useState<any>(null);
   const [applications, setApplications] = useState<StoredApplication[]>(() => loadApplications());
   const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);

   useEffect(() => {
      setCurrentUser(readAuthUser());
   }, []);

   useEffect(() => {
      if (!toast) return;
      const timeoutId = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timeoutId);
   }, [toast]);

   const showToast = (message: string, kind: "success" | "error" = "success") => {
      setToast({ message, kind });
   };

   const handleCancelApplication = async (id?: string) => {
      if (!id) return;
      
      const isConfirmed = window.confirm("Bạn có chắc chắn muốn hủy ứng tuyển công việc này không? Hành động này không thể hoàn tác.");
      if (!isConfirmed) return;

      try {
         if (id.startsWith("api-")) {
            const backendId = id.replace("api-", "");
            if (!backendId || Number.isNaN(Number(backendId))) {
               showToast("Mã hồ sơ ứng tuyển không hợp lệ.", "error");
               return;
            }

            await applicationsApi.remove(backendId);
         }

         const updatedApps = applications.filter((app) => app.id !== id);
         setApplications(updatedApps);

         const rawLocal = localStorage.getItem("jobpilot_applications");
         if (rawLocal) {
            const parsed = JSON.parse(rawLocal) as StoredApplication[];
            if (Array.isArray(parsed)) {
               const updatedLocal = parsed.filter((app) => app && app.id !== id);
               localStorage.setItem("jobpilot_applications", JSON.stringify(updatedLocal));
            }
         }
         
         window.dispatchEvent(new Event("jobpilot-data-updated"));
         showToast("Hủy ứng tuyển thành công!");
      } catch (err) {
         console.error("Cancel application failed:", err);
         showToast(
            err instanceof Error ? `Không thể hủy ứng tuyển: ${err.message}` : "Lỗi kết nối khi hủy ứng tuyển. Vui lòng thử lại sau.",
            "error",
         );
      }
   };

   useEffect(() => {
      if (!currentUser) return;

      applicationsApi.listMine()
         .then((apiData) => {
            const mapped = apiData.map(mapApiApplication);
            setApplications((prevLocal) => {
               const merged = [...mapped];
               prevLocal.forEach((localItem) => {
                  const alreadyExists = merged.some(
                     (mergedItem) => 
                        mergedItem.title?.toLowerCase() === localItem.title?.toLowerCase() &&
                        mergedItem.company?.toLowerCase() === localItem.company?.toLowerCase()
                  );
                  if (!alreadyExists) {
                     merged.push(localItem);
                  }
               });
               return merged;
            });
         })
         .catch((err) => {
            console.error("Failed to fetch applications from server:", err);
         });
   }, [currentUser]);

   const renderTag = (label: string) => (
      <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600">
         {label}
      </span>
   );

   const logoSrc = typeof logoImg === 'string' ? logoImg : (logoImg as any).src;

   if (!currentUser) {
      return (
         <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.25)]">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 px-6 py-10 text-white md:px-10">
               <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100">
                  <img src={logoSrc} alt="JobPilot logo" className="h-4 w-4" style={{ objectFit: "contain" }} />
                  Hồ sơ ứng tuyển
               </span>
               <h1 className="mt-5 text-3xl font-black tracking-tight text-white md:text-4xl">
                  Công việc đã ứng tuyển
               </h1>
               <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/80 md:text-base">
                  Theo dõi vị trí đã nộp, công ty, thời gian ứng tuyển và trạng thái phản hồi của từng hồ sơ.
               </p>
               <Link
                  href="/dang-nhap?next=/cong-viec-da-ung-tuyen"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-gray-900 transition-transform hover:-translate-y-0.5"
               >
                  Đăng nhập để xem hồ sơ
                  <ArrowRight className="h-4 w-4" />
               </Link>
            </div>
            <div className="px-6 py-8 md:px-10">
               <p className="mt-3 max-w-2xl text-sm leading-7 text-emerald-50/80 md:text-base">
                  Bạn cần đăng nhập để xem danh sách công việc đã ứng tuyển.
               </p>
            </div>
         </section>
      );
   }

   return (
      <section className="mx-auto max-w-6xl space-y-6">
         <div className="grid gap-4 lg:grid-cols-[1.65fr_0.95fr]">
            <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] md:p-8">
               <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                     <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-600">Danh sách hồ sơ</p>
                     <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">{currentUser.name}</h2>
                     <p className="mt-2 text-sm leading-7 text-slate-700">
                        Mỗi hồ sơ bên dưới đều hiển thị trạng thái hiện tại để bạn biết đang chờ xác nhận, đã phỏng vấn hay đã trúng tuyển.
                     </p>
                  </div>
                  <Link
                     href="/tim-viec"
                     className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                     Tìm thêm việc
                     <ArrowRight className="h-4 w-4" />
                  </Link>
               </div>

               <div className="mt-6 space-y-4">
                  {applications.length === 0 ? (
                     <div className="rounded-[24px] border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white text-slate-400 shadow-sm">
                           <Building2 className="h-6 w-6" />
                        </div>
                        <h3 className="mt-4 text-lg font-bold text-slate-900">Chưa có hồ sơ nào</h3>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-slate-700">
                           Khi bạn ứng tuyển từ trang việc làm hoặc công ty, hồ sơ sẽ xuất hiện tại đây kèm thời gian và trạng thái xử lý.
                        </p>
                     </div>
                  ) : (
                     applications.map((job) => {
                        const statusMeta = getApplicationStatusMeta(job.status);
                        const tone = statusToneStyles[statusMeta.tone] ?? statusToneStyles.slate;
                        const placeLabel = job.place ?? job.industry;

                        return (
                           <article
                              key={job.id ?? `${job.company}-${job.title}-${job.appliedAt}`}
                              className={`rounded-[24px] border ${tone.border} bg-gradient-to-br ${tone.panel} p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.35)]`}
                           >
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                 <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                       <span className="inline-flex items-center rounded-full bg-gray-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                                          Hồ sơ ứng tuyển
                                       </span>
                                       <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${tone.badge}`}>
                                          {statusMeta.label}
                                       </span>
                                    </div>
                                    <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900">{toVietnameseJobTitle(job.title ?? "Vị trí chưa xác định")}</h3>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
                                       <span className="inline-flex items-center gap-1.5">
                                          <Building2 className="h-4 w-4 text-slate-600" />
                                          {job.company ?? "Chưa có công ty"}
                                       </span>
                                       {placeLabel && (
                                          <span className="inline-flex items-center gap-1.5">
                                             <MapPin className="h-4 w-4 text-slate-600" />
                                             {placeLabel}
                                          </span>
                                       )}
                                       <span className="inline-flex items-center gap-1.5">
                                          <CalendarClock className="h-4 w-4 text-slate-600" />
                                          {job.appliedAt ?? job.savedAt ?? "Chưa xác định thời gian"}
                                       </span>
                                    </div>
                                 </div>

                                 <div className="shrink-0 rounded-2xl bg-white/70 px-4 py-3 text-right shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-700">Trạng thái hiện tại</p>
                                    <p className="mt-1 text-sm font-bold text-slate-900">{statusMeta.label}</p>
                                 </div>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                 {job.salary && renderTag(job.salary)}
                                 {job.field && renderTag(job.field)}
                                 {job.type && renderTag(job.type)}
                                 {job.industry && renderTag(job.industry)}
                              </div>

                              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/70 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between">
                                 <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${tone.accent}`} />
                                    <div>
                                       <p className="text-sm font-semibold text-slate-900">{statusMeta.note}</p>
                                       <p className="mt-1 text-sm leading-6 text-slate-700">Nếu hồ sơ đã được xử lý, trạng thái sẽ được phản ánh ngay tại đây.</p>
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                       <CalendarClock className="h-4 w-4" />
                                       Cập nhật theo thời gian nộp
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => handleCancelApplication(job.id)}
                                       className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 cursor-pointer"
                                    >
                                       Hủy ứng tuyển
                                    </button>
                                 </div>
                              </div>
                           </article>
                        );
                     })
                  )}
               </div>
            </div>

            <aside className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] md:p-8">
               <h3 className="text-lg font-black tracking-tight text-slate-900">Giải thích trạng thái</h3>
               <div className="mt-5 space-y-3">
                  {[
                     { title: "Đang chờ xác nhận", detail: "Hồ sơ đã gửi nhưng nhà tuyển dụng chưa phản hồi." },
                     { title: "Hồ sơ đã tiếp nhận", detail: "Hệ thống ghi nhận, đang chờ xử lý nội bộ." },
                     { title: "Mời phỏng vấn", detail: "Bạn đã qua vòng sàng lọc và có lịch trao đổi tiếp theo." },
                     { title: "Trúng tuyển", detail: "Ứng tuyển thành công, có thể bắt đầu bước nhận việc." },
                     { title: "Không phù hợp", detail: "Hồ sơ chưa đáp ứng yêu cầu tuyển chọn hiện tại." },
                  ].map((item) => (
                     <div key={item.title} className="rounded-2xl border border-gray-200 bg-emerald-50 px-4 py-4">
                        <p className="text-sm font-bold text-slate-900">{toVietnameseJobTitle(item.title)}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{item.detail}</p>
                     </div>
                  ))}
               </div>

               <div className="mt-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-50/80">Mẹo theo dõi</p>
                  <p className="mt-2 text-sm leading-7 text-white/90">
                     Hãy lưu lại các job quan tâm trước, sau đó ứng tuyển từ cùng một thẻ để tra cứu dễ hơn khi danh sách hồ sơ tăng lên.
                  </p>
               </div>
            </aside>
         </div>

         {toast && (
            <div style={{ position: "fixed", left: "50%", top: 24, transform: "translateX(-50%)", zIndex: 1300, minWidth: "min(520px, calc(100vw - 24px))" }}>
               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${toast.kind === "success" ? "#86efac" : "#fca5a5"}`, background: toast.kind === "success" ? "linear-gradient(135deg, #f0fdf4, #ffffff)" : "linear-gradient(135deg, #fff1f2, #ffffff)", boxShadow: "0 18px 50px rgba(15,23,42,0.16)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                     <div style={{ width: 10, height: 10, borderRadius: 999, background: toast.kind === "success" ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
                     <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{toast.message}</p>
                  </div>
                  <button onClick={() => setToast(null)} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>×</button>
               </div>
            </div>
         )}
      </section>
   );
}
