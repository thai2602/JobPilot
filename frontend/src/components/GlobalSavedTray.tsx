'use client';

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, CalendarClock, Clock3, Heart, MapPin, Trash2, Wallet, X } from "lucide-react";
import { getApplicationStatusMeta } from "../utils/application";
import { toVietnameseJobTitle } from "../utils/jobTitle";
import { applicationsApi, type ApiApplication } from "../services/applicationsApi";
import { savedJobsApi, type ApiSavedJob } from "../services/savedJobsApi";
import { readAuthUser, subscribeAuthUserChange } from "../utils/auth";
import { isCvEditorRoute } from "../utils/routes";

type SavedItem = {
   id?: string;
   title?: string;
   company?: string;
   place?: string;
   field?: string;
   salary?: string;
   type?: string;
   appliedAt?: string;
   savedAt?: string;
   status?: string;
   jobId?: number;
   cvId?: number;
};

const formatSalary = (salaryMin?: number, salaryMax?: number) =>
   salaryMin && salaryMax
      ? `${Math.round(salaryMin / 1_000_000)}–${Math.round(salaryMax / 1_000_000)} triệu`
      : "Thỏa thuận";

const formatJobType = (jobType?: string) =>
   jobType === "FULL_TIME" ? "Full-time" : jobType === "REMOTE" ? "Remote" : "Hybrid";

const mapApplication = (application: ApiApplication): SavedItem => ({
   id: `api-${application.id}`,
   jobId: application.job.id,
   cvId: application.cvId,
   title: application.job.title,
   company: application.job.company?.name,
   place: application.job.locationCity,
   salary: formatSalary(application.job.salaryMin, application.job.salaryMax),
   type: formatJobType(application.job.jobType),
   appliedAt: application.appliedAt ? new Date(application.appliedAt).toLocaleString("vi-VN") : undefined,
   status: application.status,
});

const mapSavedJob = (savedJob: ApiSavedJob): SavedItem => ({
   id: `api-saved-${savedJob.id}`,
   jobId: savedJob.job.id,
   title: savedJob.job.title,
   company: savedJob.job.company?.name,
   place: savedJob.job.locationCity,
   salary: formatSalary(savedJob.job.salaryMin, savedJob.job.salaryMax),
   type: formatJobType(savedJob.job.jobType),
   savedAt: savedJob.savedAt ? new Date(savedJob.savedAt).toLocaleString("vi-VN") : undefined,
});

const readList = (key: string): SavedItem[] => {
   if (typeof window === "undefined") return [];
   try {
      const raw = localStorage.getItem(key);
      if (!raw) {
         return [];
      }

      const parsed = JSON.parse(raw) as SavedItem[];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
   } catch {
      return [];
   }
};

export default function GlobalSavedTray() {
   const pathname = usePathname();
   const editorWorkspace = isCvEditorRoute(pathname);
   const [showTray, setShowTray] = useState(false);
   const [applications, setApplications] = useState<SavedItem[]>([]);
   const [savedJobs, setSavedJobs] = useState<SavedItem[]>([]);
   const [trayError, setTrayError] = useState("");

   const syncFromStorage = () => {
      setApplications(readList("jobpilot_applications"));
      setSavedJobs(readList("jobpilot_saved_jobs"));
   };

   useEffect(() => {
      if (editorWorkspace) return;
      let cancelled = false;
      let syncVersion = 0;
      const syncForCurrentSession = () => {
         const currentVersion = ++syncVersion;
         syncFromStorage();
         if (!readAuthUser()) return;

         Promise.all([applicationsApi.listMine(), savedJobsApi.listMine()])
            .then(([serverApplications, serverSavedJobs]) => {
               if (cancelled || currentVersion !== syncVersion) return;
               const mappedApplications = serverApplications.map(mapApplication);
               const mappedSavedJobs = serverSavedJobs.map(mapSavedJob);
               const localApplications = readList("jobpilot_applications");
               const localSavedJobs = readList("jobpilot_saved_jobs");
               const mergedApplications = [
                  ...mappedApplications,
                  ...localApplications.filter((localItem) =>
                     !localItem.id?.startsWith("api-") &&
                     !mappedApplications.some(
                        (serverItem) => serverItem.title === localItem.title && serverItem.company === localItem.company,
                     ),
                  ),
               ];
               const mergedSavedJobs = [
                  ...mappedSavedJobs,
                  ...localSavedJobs.filter((localItem) =>
                     !localItem.id?.startsWith("api-saved-") &&
                     !mappedSavedJobs.some(
                        (serverItem) => serverItem.title === localItem.title && serverItem.company === localItem.company,
                     ),
                  ),
               ];
               setApplications(mergedApplications);
               setSavedJobs(mergedSavedJobs);
               localStorage.setItem("jobpilot_applications", JSON.stringify(mergedApplications));
               localStorage.setItem("jobpilot_saved_jobs", JSON.stringify(mergedSavedJobs));
               window.dispatchEvent(new Event("jobpilot-data-updated"));
            })
            .catch((error) => {
               if (cancelled || currentVersion !== syncVersion) return;
               console.error("Không thể đồng bộ khay việc làm:", error);
            });
      };

      syncForCurrentSession();
      const unsubscribeAuth = subscribeAuthUserChange(syncForCurrentSession);

      // Listen for storage events from other tabs
      const handleStorage = (event: StorageEvent) => {
         if (event.key === "jobpilot_applications" || event.key === "jobpilot_saved_jobs" || event.key === null) {
            syncFromStorage();
         }
      };

      // Listen for custom events from same tab
      const handleCustomUpdate = () => {
         syncFromStorage();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener("jobpilot-data-updated", handleCustomUpdate);
      return () => {
         cancelled = true;
         unsubscribeAuth();
         window.removeEventListener("storage", handleStorage);
         window.removeEventListener("jobpilot-data-updated", handleCustomUpdate);
      };
   }, [editorWorkspace]);

   const removeApplication = async (id?: string) => {
      if (!id) {
         return;
      }

      setTrayError("");
      try {
         if (id.startsWith("api-")) {
            const backendId = Number(id.slice(4));
            if (!Number.isInteger(backendId)) throw new Error("ID ứng tuyển không hợp lệ.");
            await applicationsApi.remove(backendId);
         }
         const updated = applications.filter((item) => item.id !== id);
         setApplications(updated);
         localStorage.setItem("jobpilot_applications", JSON.stringify(updated));
         window.dispatchEvent(new Event("jobpilot-data-updated"));
      } catch (error) {
         setTrayError(error instanceof Error ? error.message : "Không thể xóa hồ sơ ứng tuyển.");
      }
   };

   const removeSavedJob = async (id?: string) => {
      if (!id) {
         return;
      }

      setTrayError("");
      try {
         if (id.startsWith("api-saved-")) {
            const backendId = Number(id.slice("api-saved-".length));
            if (!Number.isInteger(backendId)) throw new Error("ID công việc đã lưu không hợp lệ.");
            await savedJobsApi.remove(backendId);
         }
         const updated = savedJobs.filter((item) => item.id !== id);
         setSavedJobs(updated);
         localStorage.setItem("jobpilot_saved_jobs", JSON.stringify(updated));
         window.dispatchEvent(new Event("jobpilot-data-updated"));
      } catch (error) {
         setTrayError(error instanceof Error ? error.message : "Không thể xóa công việc đã lưu.");
      }
   };

   if (editorWorkspace) {
      return null;
   }

   return (
      <>
         <style>{`
            @keyframes saved-tray-pulse-ring {
               0% { transform: scale(0.95); opacity: 0.6; }
               50% { transform: scale(1.2); opacity: 0.3; }
               100% { transform: scale(1.4); opacity: 0; }
            }
            .saved-tray-pulse-ring {
               animation: saved-tray-pulse-ring 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }
            .saved-tray-toggle {
               position: fixed;
               z-index: 1000;
               right: 24px;
               bottom: 24px;
               width: 60px;
               height: 60px;
            }
            .saved-tray-panel {
               position: fixed;
               right: 24px;
               bottom: 94px;
               width: min(420px, calc(100vw - 32px));
               max-height: 72vh;
               z-index: 1101;
            }
         `}</style>

         {!showTray && (
            <div
               className="saved-tray-toggle flex items-center justify-center transition-all duration-300"
            >
               <div className="absolute inset-0 rounded-full bg-rose-500/20 saved-tray-pulse-ring pointer-events-none" />
               <button
                  onClick={() => setShowTray(true)}
                  className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-[0_10px_35px_rgba(244,63,94,0.28)] transition-all duration-300 hover:scale-105"
                  title="Thông tin cá nhân & Đã lưu"
               >
                  <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <Heart className="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
               </button>
            </div>
         )}

         {showTray && (
            <>
               <div
                  onClick={() => setShowTray(false)}
                  style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)", zIndex: 1100 }}
               />
               <div
                  className="saved-tray-panel border border-slate-200/80"
                  style={{
                     overflowY: "auto",
                     background: "#fff",
                     borderRadius: "28px",
                     boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
                     padding: "20px",
                  }}
               >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 16, background: "linear-gradient(135deg, #fda4af, #ec4899)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 24px rgba(244,63,94,0.22)" }}>
                           <Heart style={{ width: 18, height: 18, color: "#fff" }} />
                        </div>
                        <div>
                           <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>Vị trí đã ứng tuyển</h3>
                           <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Theo dõi hồ sơ ứng tuyển và mục đã lưu</p>
                        </div>
                     </div>
                     <button
                        onClick={() => setShowTray(false)}
                        style={{
                           width: 32,
                           height: 32,
                           borderRadius: 8,
                           border: "1px solid #e2e8f0",
                           background: "#fff",
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                           cursor: "pointer",
                           color: "#64748b",
                        }}
                     >
                        <X style={{ width: 16, height: 16 }} />
                     </button>
                  </div>

                  {trayError && (
                     <div role="alert" style={{ marginBottom: 12, borderRadius: 10, border: "1px solid #fecaca", background: "#fff1f2", padding: "9px 11px", color: "#be123c", fontSize: 12, fontWeight: 700 }}>
                        {trayError}
                     </div>
                  )}

                  <div style={{ display: "grid", gap: "14px" }}>
                     <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                           Đã ứng tuyển ({applications.length})
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                           {applications.length === 0 ? (
                              <div style={{ fontSize: 13, color: "#94a3b8" }}>Chưa có ứng tuyển nào.</div>
                           ) : (
                              applications.map((item) => {
                                 const status = getApplicationStatusMeta(item.status);
                                 return (
                                    <article key={item.id} style={{ position: "relative", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                                       <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", paddingRight: 36 }}>{toVietnameseJobTitle(item.title || "Vị trí chưa xác định")}</div>
                                       <div style={{ marginTop: 4, fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                                          <Building2 style={{ width: 12, height: 12 }} />
                                          {item.company || "Chưa có công ty"}
                                       </div>
                                       <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          {item.place && (
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 999, background: "#fff", padding: "3px 8px" }}>
                                                <MapPin style={{ width: 11, height: 11 }} />
                                                {item.place}
                                             </span>
                                          )}
                                          {item.salary && (
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 999, background: "#fff", padding: "3px 8px" }}>
                                                <Wallet style={{ width: 11, height: 11 }} />
                                                {item.salary}
                                             </span>
                                          )}
                                          {item.type && (
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, border: "1px solid #e2e8f0", borderRadius: 999, background: "#fff", padding: "3px 8px" }}>
                                                <Clock3 style={{ width: 11, height: 11 }} />
                                                {item.type}
                                             </span>
                                          )}
                                       </div>
                                       <div style={{ marginTop: 7, fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                                          <CalendarClock style={{ width: 12, height: 12 }} />
                                          {item.appliedAt || "Chưa xác định thời gian"}
                                       </div>
                                       <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{status.label}</div>
                                       <button
                                          onClick={() => removeApplication(item.id)}
                                          style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                          title="Xóa hồ sơ ứng tuyển"
                                       >
                                          <Trash2 style={{ width: 13, height: 13 }} />
                                       </button>
                                    </article>
                                 );
                              })
                           )}
                        </div>
                     </div>

                     <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
                           Công việc đã lưu ({savedJobs.length})
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                           {savedJobs.length === 0 ? (
                              <div style={{ fontSize: 13, color: "#94a3b8" }}>Chưa có công việc nào được lưu.</div>
                           ) : (
                              savedJobs.map((item) => (
                                 <article key={item.id} style={{ position: "relative", border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", paddingRight: 36 }}>{toVietnameseJobTitle(item.title || "Công việc đã lưu")}</div>
                                    <div style={{ marginTop: 4, fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}>
                                       <Building2 style={{ width: 12, height: 12 }} />
                                       {item.company || "Chưa có công ty"}
                                    </div>
                                    <div style={{ marginTop: 7, fontSize: 11, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
                                       <CalendarClock style={{ width: 12, height: 12 }} />
                                       {item.savedAt || "Chưa xác định thời gian"}
                                    </div>
                                    <button
                                       onClick={() => removeSavedJob(item.id)}
                                       style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 8, border: "1px solid #fecaca", background: "#fff1f2", color: "#be123c", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                                       title="Xóa mục đã lưu"
                                    >
                                       <Trash2 style={{ width: 13, height: 13 }} />
                                    </button>
                                 </article>
                              ))
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </>
         )}
      </>
   );
}
