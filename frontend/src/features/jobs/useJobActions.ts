import { useEffect, useState } from "react";
import { applicationsApi } from "../../services/applicationsApi";
import { savedJobsApi } from "../../services/savedJobsApi";
import { readAuthUser } from "../../utils/auth";
import { hasCreatedCv } from "../../utils/cv";
import type { Job } from "./jobMapping";

const APPLICATIONS_STORAGE_KEY = "jobpilot_applications";
const SAVED_JOBS_STORAGE_KEY = "jobpilot_saved_jobs";
const DATA_UPDATED_EVENT = "jobpilot-data-updated";

/** Bản ghi lưu trong localStorage; GlobalSavedTray và các trang khác cũng đọc chung khoá này. */
type StoredJob = Omit<Job, "id"> & { id?: number | string; jobId?: number; serverId?: number; [key: string]: unknown };

export type Toast = { kind: "success" | "error"; message: string };

const readStoredList = <T,>(key: string): T[] => {
   if (typeof window === "undefined") return [];
   try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) as T[] : [];
   } catch {
      return [];
   }
};

const normalizedText = (value: unknown) => String(value ?? "").trim().toLowerCase();

const sameJob = (stored: StoredJob, job: Job): boolean => {
   const storedJobId = Number(stored?.jobId);
   const jobId = Number(job?.id);
   if (Number.isFinite(storedJobId) && Number.isFinite(jobId) && storedJobId === jobId) return true;
   return normalizedText(stored?.company) === normalizedText(job?.company)
      && normalizedText(stored?.title) === normalizedText(job?.title);
};

const getSavedRecordId = (savedJob: StoredJob): number | undefined => {
   const explicitId = Number(savedJob?.serverId);
   if (Number.isInteger(explicitId) && explicitId > 0) return explicitId;
   const id = String(savedJob?.id ?? "");
   if (!id.startsWith("api-saved-")) return undefined;
   const parsed = Number(id.slice("api-saved-".length));
   return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const jobKey = (job: Job) => (job.id ? `job-${job.id}` : `${job.company}-${job.title}`);

/**
 * Ứng tuyển và lưu việc làm: gọi API khi đã đăng nhập, đồng bộ danh sách với localStorage
 * và giữa các tab qua sự kiện "storage" / "jobpilot-data-updated".
 */
export function useJobActions() {
   const [applications, setApplications] = useState<StoredJob[]>([]);
   const [savedJobs, setSavedJobs] = useState<StoredJob[]>([]);
   const [hydrated, setHydrated] = useState(false);
   const [savingJobKey, setSavingJobKey] = useState<string | null>(null);
   const [applyingJob, setApplyingJob] = useState<Job | null>(null);
   const [toast, setToast] = useState<Toast | null>(null);

   useEffect(() => {
      setApplications(readStoredList(APPLICATIONS_STORAGE_KEY));
      setSavedJobs(readStoredList(SAVED_JOBS_STORAGE_KEY));
      setHydrated(true);
   }, []);

   useEffect(() => {
      if (!hydrated) return;
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
   }, [applications, hydrated]);

   useEffect(() => {
      if (!hydrated) return;
      localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(savedJobs));
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
   }, [savedJobs, hydrated]);

   useEffect(() => {
      const syncFromStorage = () => {
         const nextApplications = readStoredList<StoredJob>(APPLICATIONS_STORAGE_KEY);
         const nextSavedJobs = readStoredList<StoredJob>(SAVED_JOBS_STORAGE_KEY);
         setApplications((current) => JSON.stringify(current) === JSON.stringify(nextApplications) ? current : nextApplications);
         setSavedJobs((current) => JSON.stringify(current) === JSON.stringify(nextSavedJobs) ? current : nextSavedJobs);
      };
      const handleStorage = (event: StorageEvent) => {
         if (event.key === APPLICATIONS_STORAGE_KEY || event.key === SAVED_JOBS_STORAGE_KEY || event.key === null) {
            syncFromStorage();
         }
      };
      window.addEventListener(DATA_UPDATED_EVENT, syncFromStorage);
      window.addEventListener("storage", handleStorage);
      return () => {
         window.removeEventListener(DATA_UPDATED_EVENT, syncFromStorage);
         window.removeEventListener("storage", handleStorage);
      };
   }, []);

   useEffect(() => {
      if (!toast) return;
      const timeoutId = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timeoutId);
   }, [toast]);

   const showToast = (message: string, kind: Toast["kind"] = "success") => setToast({ message, kind });

   const isSaved = (job: Job) => savedJobs.some((item) => sameJob(item, job));
   const isApplied = (job: Job) => applications.some((item) => sameJob(item, job));
   const isSaving = (job: Job) => savingJobKey === jobKey(job);

   /** Kiểm tra điều kiện rồi mở hộp chọn CV. */
   const startApplication = (job: Job) => {
      if (!readAuthUser()) {
         showToast("Bạn cần đăng nhập trước khi ứng tuyển.", "error");
         return;
      }
      if (!hasCreatedCv()) {
         showToast("Bạn chưa có CV. Vui lòng tạo CV trước khi ứng tuyển.", "error");
         return;
      }
      if (isApplied(job)) {
         showToast("Bạn đã ứng tuyển vị trí này rồi.", "error");
         return;
      }
      setApplyingJob(job);
   };

   const confirmApplication = async (cvId: number) => {
      if (!applyingJob) return;
      const job = applyingJob;
      setApplyingJob(null);

      let id = `${job.company}-${job.title}-${Date.now()}`;
      if (job.id) {
         try {
            const created = await applicationsApi.create({ jobId: job.id, cvId });
            id = `api-${created.id}`;
         } catch (err) {
            console.error("Backend apply failed:", err);
            showToast(
               err instanceof Error ? `Lỗi ứng tuyển: ${err.message}` : "Lỗi kết nối máy chủ khi ứng tuyển. Vui lòng thử lại sau.",
               "error",
            );
            return;
         }
      }

      setApplications((current) => [
         {
            ...job,
            id,
            jobId: job.id,
            appliedAt: new Date().toLocaleString("vi-VN"),
            status: "Đang chờ xác nhận",
            trackingNote: "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
         },
         ...current,
      ]);
      showToast(`Đã ứng tuyển thành công: ${job.title} tại ${job.company}.`);
   };

   const toggleSaved = async (job: Job) => {
      if (savingJobKey) return;
      setSavingJobKey(jobKey(job));

      const existing = savedJobs.find((item) => sameJob(item, job));
      try {
         if (existing) {
            const serverSavedId = getSavedRecordId(existing);
            if (readAuthUser() && serverSavedId) await savedJobsApi.remove(serverSavedId);
            setSavedJobs((current) => current.filter((item) => !sameJob(item, job)));
            showToast(`Đã bỏ lưu công việc: ${job.title}.`);
            return;
         }

         let id = `${job.company}-${job.title}-${Date.now()}`;
         let serverId: number | undefined;
         if (job.id && readAuthUser()) {
            const saved = await savedJobsApi.create(job.id);
            serverId = saved.id;
            id = `api-saved-${saved.id}`;
         }
         const newSavedJob: StoredJob = { ...job, id, serverId, jobId: job.id, savedAt: new Date().toLocaleString("vi-VN") };
         setSavedJobs((current) => [newSavedJob, ...current.filter((item) => !sameJob(item, job))]);
         showToast(`Đã lưu công việc: ${job.title} tại ${job.company}.`);
      } catch (err) {
         console.error("Backend saved-job action failed:", err);
         showToast(
            err instanceof Error ? `Không thể cập nhật việc làm đã lưu: ${err.message}` : "Không thể cập nhật việc làm đã lưu trên máy chủ.",
            "error",
         );
      } finally {
         setSavingJobKey(null);
      }
   };

   return {
      isSaved,
      isApplied,
      isSaving,
      toggleSaved,
      startApplication,
      confirmApplication,
      applyingJob,
      cancelApplication: () => setApplyingJob(null),
      toast,
      showToast,
   };
}
