import { API_URL } from "../../config/env";
import type { ApiCompany } from "../../services/companiesApi";
import type { ApiJob } from "../../services/jobsApi";
import type { JobRecommendation } from "../../services/recommendationsApi";
import { cleanApiText, splitApiText } from "../../utils/content";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { formatSalaryRange } from "../../utils/salary";
import { fallbackCompanyLogo } from "../companies/companyAssets";

export type HomeJob = {
   id?: number;
   slug?: string;
   title: string;
   company: string;
   companySlug?: string;
   place: string;
   salary: string;
   tags: string[];
   industry?: string;
};

export type HomeIndustry = {
   industry: string;
   color: string;
   jobs: HomeJob[];
};

export type HomeCompany = {
   name: string;
   slug?: string;
   employees: string;
   location: string;
   openJobs: number;
   color: string;
   initial: string;
   avatar?: string;
   category: string;
};

export type RecruitmentTrendPoint = {
   month: string;
   jobs: number;
   companies: number;
   salary: number;
};

export type DistributionPoint = {
   name: string;
   value: number;
   color: string;
};

export type SalaryPoint = {
   position: string;
   salary: number;
   color: string;
};

export type MarketStat = {
   label: string;
   /** null = chưa có số liệu (đang tải hoặc API lỗi) */
   value: string | null;
   accent: string;
};

export const RECOMMENDATION_GROUP = "Gợi ý phù hợp với CV";

const industryColors = ["#059669", "#0284c7", "#7c3aed", "#ea580c", "#f59e0b"];

const resolveAssetUrl = (value?: string): string | undefined => {
   const source = value?.trim();
   if (!source) return undefined;
   if (/^(https?:|data:|blob:)/i.test(source)) return source;
   return `${API_URL}${source.startsWith("/") ? "" : "/"}${source}`;
};

/** Lương theo triệu đồng; API có thể trả theo đồng hoặc theo triệu. */
const salaryInMillions = (job: Pick<ApiJob, "salaryMin" | "salaryMax">): number[] =>
   [job.salaryMin, job.salaryMax]
      .filter((value): value is number => typeof value === "number" && value > 0)
      .map((value) => value >= 100_000 ? value / 1_000_000 : value);

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

const isSameDay = (left: Date, right: Date) =>
   left.getFullYear() === right.getFullYear()
   && left.getMonth() === right.getMonth()
   && left.getDate() === right.getDate();

const parseDate = (value?: string): Date | null => {
   if (!value) return null;
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? null : date;
};

export const mapHomeJob = (job: ApiJob): HomeJob => ({
   id: job.id,
   slug: job.slug,
   title: toVietnameseJobTitle(job.title),
   company: cleanApiText(job.company?.name) || "Doanh nghiệp đang cập nhật",
   companySlug: job.company?.slug,
   place: cleanApiText(job.locationCity) || cleanApiText(job.locationAddress) || "Địa điểm linh hoạt",
   salary: formatSalaryRange(job.salaryMin, job.salaryMax),
   industry: cleanApiText(job.industry) || "Ngành nghề khác",
   tags: Array.from(new Set([
      cleanApiText(job.jobLevel),
      cleanApiText(job.jobType),
      cleanApiText(job.experienceYears),
      ...splitApiText(job.requirements, 2),
   ].filter(Boolean))).slice(0, 3),
});

export const mapRecommendation = (job: JobRecommendation): HomeJob => ({
   id: job.jobId,
   slug: job.slug,
   title: toVietnameseJobTitle(job.title),
   company: cleanApiText(job.company?.name) || "Doanh nghiệp đang cập nhật",
   companySlug: job.company?.slug,
   place: cleanApiText(job.locationCity) || cleanApiText(job.locationAddress) || "Địa điểm linh hoạt",
   salary: formatSalaryRange(job.salaryMin, job.salaryMax),
   industry: RECOMMENDATION_GROUP,
   tags: (job.matchedSkills.length ? job.matchedSkills : [job.jobLevel, job.jobType])
      .filter((tag): tag is string => Boolean(tag))
      .slice(0, 3),
});

/** Ba ngành có nhiều tin nhất, mỗi ngành ba tin. */
export const buildIndustryGroups = (jobs: ApiJob[]): HomeIndustry[] => {
   const grouped = new Map<string, HomeJob[]>();
   jobs.forEach((job) => {
      const mapped = mapHomeJob(job);
      const industry = mapped.industry ?? "Ngành nghề khác";
      grouped.set(industry, [...(grouped.get(industry) ?? []), mapped]);
   });

   return Array.from(grouped.entries())
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, 3)
      .map(([industry, groupedJobs], index) => ({
         industry,
         color: industryColors[index % industryColors.length],
         jobs: groupedJobs.slice(0, 3),
      }));
};

/** Số tin, số công ty và lương trung bình theo tháng tạo tin, sáu tháng gần nhất. */
export const buildRecruitmentTrend = (jobs: ApiJob[]): RecruitmentTrendPoint[] => {
   const now = new Date();
   const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1));

   return months.map((month) => {
      const monthlyJobs = jobs.filter((job) => {
         const createdAt = parseDate(job.createdAt);
         return createdAt
            && createdAt.getFullYear() === month.getFullYear()
            && createdAt.getMonth() === month.getMonth();
      });
      const salaries = monthlyJobs
         .map((job) => {
            const values = salaryInMillions(job);
            return values.length ? average(values) : 0;
         })
         .filter((value) => value > 0);

      return {
         month: `T${month.getMonth() + 1}`,
         jobs: monthlyJobs.length,
         companies: new Set(monthlyJobs.map((job) => job.company?.id ?? job.company?.name).filter(Boolean)).size,
         salary: salaries.length ? Math.round(average(salaries)) : 0,
      };
   });
};

export const buildJobDistribution = (jobs: ApiJob[]): DistributionPoint[] => {
   const counts = new Map<string, number>();
   jobs.forEach((job) => {
      const industry = cleanApiText(job.industry) || "Ngành khác";
      counts.set(industry, (counts.get(industry) ?? 0) + 1);
   });
   return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([name, value], index) => ({ name, value, color: industryColors[index % industryColors.length] }));
};

export const buildSalaryByPosition = (jobs: ApiJob[]): SalaryPoint[] => {
   const groups = new Map<string, number[]>();
   jobs.forEach((job) => {
      const values = salaryInMillions(job);
      if (!values.length) return;
      const level = cleanApiText(job.jobLevel) || "Khác";
      groups.set(level, [...(groups.get(level) ?? []), average(values)]);
   });

   return Array.from(groups.entries())
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, 5)
      .map(([position, salaries], index) => ({
         position,
         salary: Math.round(average(salaries) * 10) / 10,
         color: industryColors[index % industryColors.length],
      }));
};

/** Bốn công ty nổi bật: ưu tiên isFeatured, sau đó nhiều tin nhất. */
export const pickFeaturedCompanies = (companies: ApiCompany[]): HomeCompany[] =>
   [...companies]
      .sort((left, right) => Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured))
         || (right.positions?.length ?? 0) - (left.positions?.length ?? 0))
      .slice(0, 4)
      .map((company, index) => ({
         name: company.name,
         slug: company.slug,
         employees: cleanApiText(company.size) || "Đang cập nhật",
         location: cleanApiText(company.headquarters)
            || cleanApiText(company.positions?.find((job) => job.locationCity)?.locationCity)
            || "Đang cập nhật",
         openJobs: company.positions?.length ?? 0,
         color: company.color || industryColors[index % industryColors.length],
         initial: company.name.slice(0, 1).toUpperCase(),
         avatar: resolveAssetUrl(company.logoUrl) || fallbackCompanyLogo(company.name),
         category: cleanApiText(company.industry) || "Lĩnh vực đang cập nhật",
      }));

/** API trả tối đa `limit` bản ghi; chạm trần thì hiển thị "N+". */
const countLabel = (count: number, limit: number) => `${count}${count === limit ? "+" : ""}`;

export const buildMarketStats = (jobs: ApiJob[] | null, companies: ApiCompany[] | null, limit: number): MarketStat[] => {
   const today = new Date();
   return [
      {
         label: "Việc mới hôm nay",
         value: jobs ? String(jobs.filter((job) => {
            const createdAt = parseDate(job.createdAt);
            return createdAt !== null && isSameDay(createdAt, today);
         }).length) : null,
         accent: "#f59e0b",
      },
      { label: "Việc làm đang tuyển", value: jobs ? countLabel(jobs.length, limit) : null, accent: "#22c55e" },
      { label: "Doanh nghiệp đầy đủ hồ sơ", value: companies ? countLabel(companies.length, limit) : null, accent: "#6366f1" },
   ];
};
