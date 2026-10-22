import { useEffect, useState } from "react";
import { jobsApi, type ApiJob } from "../../services/jobsApi";
import { cleanApiText } from "../../utils/content";
import { jobLevelLabels } from "../jobs/jobMapping";

/** Số tin lấy về để tính thống kê (giới hạn trang lớn nhất của API). */
const SAMPLE_SIZE = 100;
const GROUP_COLORS = ["#0f766e", "#1d4ed8", "#a21caf", "#b91c1c", "#0369a1", "#a16207"];

export type SalaryGroup = { label: string; avg: number; min: number; max: number; count: number; color: string };
export type SalaryJob = { title: string; company: string; salary: number; slug: string; expired: boolean };

export type SalaryStats = {
   status: "loading" | "ready" | "error";
   /** Số tin trong mẫu */
   sampleSize: number;
   /** Số tin có công khai mức lương */
   withSalary: number;
   byLevel: SalaryGroup[];
   byIndustry: SalaryGroup[];
   jobs: SalaryJob[];
   topIndustry: { label: string; count: number } | null;
};

/** Lương theo triệu đồng; API có thể trả theo đồng hoặc theo triệu. */
const toMillions = (value: number) => (value >= 100_000 ? value / 1_000_000 : value);

const midpoint = (job: ApiJob): number | null => {
   const values = [job.salaryMin, job.salaryMax]
      .filter((value): value is number => typeof value === "number" && value > 0)
      .map(toMillions);
   return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const group = (entries: Array<{ key: string; salary: number }>, minCount: number, limit: number): SalaryGroup[] => {
   const buckets = new Map<string, number[]>();
   entries.forEach(({ key, salary }) => buckets.set(key, [...(buckets.get(key) ?? []), salary]));
   return Array.from(buckets.entries())
      .filter(([, values]) => values.length >= minCount)
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, limit)
      .map(([label, values], index) => ({
         label,
         avg: round1(values.reduce((sum, value) => sum + value, 0) / values.length),
         min: round1(Math.min(...values)),
         max: round1(Math.max(...values)),
         count: values.length,
         color: GROUP_COLORS[index % GROUP_COLORS.length],
      }));
};

const initial: SalaryStats = {
   status: "loading", sampleSize: 0, withSalary: 0, byLevel: [], byIndustry: [], jobs: [], topIndustry: null,
};

/** Thống kê lương tính từ tin tuyển dụng thật trên JobPilot (gồm cả tin đã hết hạn). */
export function useSalaryStats(): SalaryStats {
   const [stats, setStats] = useState<SalaryStats>(initial);

   useEffect(() => {
      let cancelled = false;
      jobsApi.list({ offset: 0, limit: SAMPLE_SIZE })
         .then((jobs) => {
            if (cancelled) return;
            const priced = jobs
               .map((job) => ({ job, salary: midpoint(job) }))
               .filter((entry): entry is { job: ApiJob; salary: number } => entry.salary !== null);
            const industryCounts = new Map<string, number>();
            jobs.forEach((job) => {
               const industry = cleanApiText(job.industry);
               if (industry) industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);
            });
            const top = Array.from(industryCounts.entries()).sort((a, b) => b[1] - a[1])[0];

            setStats({
               status: "ready",
               sampleSize: jobs.length,
               withSalary: priced.length,
               byLevel: group(
                  priced.filter(({ job }) => job.jobLevel).map(({ job, salary }) => ({
                     key: jobLevelLabels[job.jobLevel!] ?? cleanApiText(job.jobLevel),
                     salary,
                  })),
                  2, 6,
               ),
               byIndustry: group(
                  priced.filter(({ job }) => cleanApiText(job.industry)).map(({ job, salary }) => ({
                     key: cleanApiText(job.industry),
                     salary,
                  })),
                  2, 6,
               ),
               jobs: priced.map(({ job, salary }) => ({
                  title: job.title,
                  company: cleanApiText(job.company?.name) || "Doanh nghiệp đang cập nhật",
                  salary: round1(salary),
                  slug: job.slug,
                  expired: Boolean(job.expired),
               })),
               topIndustry: top ? { label: top[0], count: top[1] } : null,
            });
         })
         .catch((error: unknown) => {
            console.error("Không tải được dữ liệu lương", error);
            if (!cancelled) setStats({ ...initial, status: "error" });
         });
      return () => { cancelled = true; };
   }, []);

   return stats;
}
