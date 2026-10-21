import { useEffect, useState } from "react";
import { applicationsApi, type ApiApplication } from "../../services/applicationsApi";
import { readAuthUser } from "../../utils/auth";
import { hasCreatedCv } from "../../utils/cv";
import type { HomeJob } from "./homeData";

const APPLICATIONS_STORAGE_KEY = "jobpilot_applications";

export type HomeToast = { kind: "success" | "error"; message: string };

export const applicationKey = (industryName: string, job: HomeJob): string =>
   job.id ? `job:${job.id}` : `${industryName}-${job.company}-${job.title}`;

const readStoredApplicationKeys = (): Set<string> => {
   const keys = new Set<string>();
   if (typeof window === "undefined") return keys;
   try {
      const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
      const stored: unknown = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored)) return keys;
      stored.filter(Boolean).forEach((item: Record<string, any>) => {
         const apiJobId = item.jobId ?? item.job?.id;
         if (apiJobId) keys.add(`job:${apiJobId}`);
         if (item.industry && item.company && item.title) keys.add(`${item.industry}-${item.company}-${item.title}`);
         if (typeof item.id === "string") keys.add(item.id);
      });
   } catch {
      // localStorage hỏng thì coi như chưa ứng tuyển gì
   }
   return keys;
};

/** Ứng tuyển nhanh từ trang chủ; nhớ các job đã ứng tuyển từ server và localStorage. */
export function useHomeApplications(serverAppliedJobIds: number[]) {
   const [appliedKeys, setAppliedKeys] = useState<Set<string>>(readStoredApplicationKeys);
   const [applyingJob, setApplyingJob] = useState<{ industryName: string; job: HomeJob } | null>(null);
   const [toast, setToast] = useState<HomeToast | null>(null);

   useEffect(() => {
      if (!serverAppliedJobIds.length) return;
      setAppliedKeys((current) => new Set([...current, ...serverAppliedJobIds.map((id) => `job:${id}`)]));
   }, [serverAppliedJobIds]);

   useEffect(() => {
      if (!toast) return;
      const timeoutId = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timeoutId);
   }, [toast]);

   const showToast = (message: string, kind: HomeToast["kind"] = "success") => setToast({ message, kind });

   const isApplied = (industryName: string, job: HomeJob) => appliedKeys.has(applicationKey(industryName, job));

   const startApplication = (industryName: string, job: HomeJob) => {
      if (!readAuthUser()) {
         showToast("Bạn cần đăng nhập trước khi ứng tuyển.", "error");
         return;
      }
      if (!hasCreatedCv()) {
         showToast("Bạn chưa có CV. Vui lòng tạo CV trước khi ứng tuyển.", "error");
         return;
      }
      if (isApplied(industryName, job)) {
         showToast("Bạn đã ứng tuyển vị trí này rồi.", "error");
         return;
      }
      setApplyingJob({ industryName, job });
   };

   const confirmApplication = async (cvId: number) => {
      if (!applyingJob) return;
      const { industryName, job } = applyingJob;
      setApplyingJob(null);

      const key = applicationKey(industryName, job);
      if (appliedKeys.has(key)) {
         showToast("Bạn đã ứng tuyển vị trí này rồi.", "error");
         return;
      }

      let serverApplication: ApiApplication | null = null;
      if (job.id) {
         try {
            serverApplication = await applicationsApi.create({ jobId: job.id, cvId });
         } catch (error) {
            console.error("Không thể gửi hồ sơ ứng tuyển từ homepage.", error);
            showToast(error instanceof Error ? error.message : "Không thể ứng tuyển lúc này.", "error");
            return;
         }
      }

      const id = serverApplication ? `api-${serverApplication.id}` : key;
      const application = {
         id,
         serverId: serverApplication?.id,
         jobId: job.id,
         slug: job.slug,
         company: job.company,
         title: job.title,
         salary: job.salary,
         place: job.place,
         industry: industryName,
         appliedAt: new Date().toLocaleString("vi-VN"),
         status: "Đang chờ xác nhận",
         trackingNote: "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
         cvId,
      };

      try {
         const raw = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
         const current: unknown = raw ? JSON.parse(raw) : [];
         const existing = (Array.isArray(current) ? current : []).filter(Boolean) as Array<Record<string, unknown>>;
         const updated = [application, ...existing.filter((item) => item.id !== id && (!job.id || item.jobId !== job.id))];
         localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(updated));
         window.dispatchEvent(new Event("jobpilot-data-updated"));
      } catch (error) {
         console.error("Không thể đồng bộ hồ sơ ứng tuyển vào localStorage.", error);
      }
      setAppliedKeys((current) => new Set([...current, key]));
      showToast(`Đã ứng tuyển thành công: ${job.title} tại ${job.company}.`);
   };

   return {
      isApplied,
      startApplication,
      confirmApplication,
      applyingJob,
      cancelApplication: () => setApplyingJob(null),
      toast,
      dismissToast: () => setToast(null),
   };
}
