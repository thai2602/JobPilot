'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
   ArrowRight,
   Briefcase,
   Building2,
   FileText,
   MapPin,
   Compass,
   ShieldCheck,
   Users,
   Wallet,
   Star,
} from "lucide-react";
import {
   LineChart,
   Line,
   BarChart,
   Bar,
   PieChart,
   Pie,
   Cell,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
   ResponsiveContainer,
} from "recharts";
import companyLogo1 from "../../assets/company_logo/image_1.png";
import companyLogo4 from "../../assets/company_logo/image_4.png";
import companyLogo7 from "../../assets/company_logo/image_7.png";
import companyLogo8 from "../../assets/company_logo/image_8.png";
import { API_URL } from "../../config/env";
import { applicationsApi, type ApiApplication } from "../../services/applicationsApi";
import { companiesApi, type ApiCompany } from "../../services/companiesApi";
import { jobsApi, type ApiJob } from "../../services/jobsApi";
import { recommendationsApi, type JobRecommendation } from "../../services/recommendationsApi";
import { readAuthUser } from "../../utils/auth";
import { cleanApiText, splitApiText } from "../../utils/content";
import { getActiveCvId, hasCreatedCv } from "../../utils/cv";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { formatSalaryRange } from "../../utils/salary";
import ApplyCvModal from "../../components/ApplyCvModal";

type HomeJob = {
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

type HomeIndustry = {
   industry: string;
   color: string;
   jobs: HomeJob[];
};

type HomeCompany = {
   name: string;
   slug?: string;
   rating?: string;
   employees: string;
   location: string;
   openJobs: number;
   color: string;
   initial: string;
   avatar?: string;
   category: string;
};

type RecruitmentTrendPoint = {
   month: string;
   jobs: number;
   companies: number;
   salary: number;
};

type DistributionPoint = {
   name: string;
   value: number;
   color: string;
};

type SalaryPoint = {
   position: string;
   salary: number;
   applicants?: number;
   color: string;
};

type MarketStat = {
   label: string;
   value: string;
   accent: string;
};

const quickLinks = [
   {
      title: "Tìm việc nhanh",
      desc: "Tìm đúng cơ hội theo vị trí, cấp bậc, hình thức làm việc và mức thu nhập kỳ vọng.",
      to: "/tim-viec",
      icon: Briefcase,
      accent: "#059669",
      bg: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
   },
   {
      title: "Danh sách công ty",
      desc: "Đánh giá doanh nghiệp theo văn hóa, phúc lợi và nhu cầu tuyển dụng theo từng ngành.",
      to: "/cong-ty",
      icon: Building2,
      accent: "#0284c7",
      bg: "linear-gradient(135deg, #f0f9ff 0%, #bae6fd 100%)",
   },
   {
      title: "Kho CV mẫu",
      desc: "Lựa chọn mẫu CV chuyên nghiệp theo ngành nghề và cấp độ kinh nghiệm của bạn.",
      to: "/cv-mau",
      icon: FileText,
      accent: "#7c3aed",
      bg: "linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)",
   },
];

const fallbackTopIndustryJobs: HomeIndustry[] = [
   {
      industry: "Công nghệ thông tin",
      color: "#059669",
      jobs: [
         {
            title: "Lập trình viên Frontend React",
            company: "NovaTech",
            place: "TP. HCM",
            salary: "25–35 triệu",
            tags: ["React", "TypeScript"],
         },
         {
            title: "Kỹ sư Backend Node.js",
            company: "ScaleHub",
            place: "Đà Nẵng",
            salary: "30–45 triệu",
            tags: ["Node.js", "MongoDB"],
         },
         {
            title: "Kỹ sư DevOps",
            company: "CloudTech",
            place: "Hà Nội",
            salary: "35–50 triệu",
            tags: ["Docker", "AWS"],
         },
      ],
   },
   {
      industry: "Tài chính - Ngân hàng",
      color: "#0284c7",
      jobs: [
         {
            title: "Chuyên viên tín dụng",
            company: "FinBank",
            place: "TP. HCM",
            salary: "18–30 triệu",
            tags: ["Phân tích", "Tín dụng"],
         },
         {
            title: "Nhân viên ngân hàng",
            company: "VietBank",
            place: "Hà Nội",
            salary: "12–20 triệu",
            tags: ["Khách hàng", "Giao dịch"],
         },
         {
            title: "Kế toán viên",
            company: "Finverse",
            place: "Đà Nẵng",
            salary: "15–25 triệu",
            tags: ["Kế toán", "Báo cáo"],
         },
      ],
   },
   {
      industry: "Kinh doanh - Buôn bán",
      color: "#7c3aed",
      jobs: [
         {
            title: "Nhân viên kinh doanh",
            company: "SalesPro",
            place: "TP. HCM",
            salary: "15–25 triệu",
            tags: ["Bán hàng", "Khách hàng"],
         },
         {
            title: "Trưởng phòng kinh doanh",
            company: "BizHub",
            place: "Hà Nội",
            salary: "30–50 triệu",
            tags: ["Lãnh đạo", "Chiến lược"],
         },
         {
            title: "Nhân viên kinh doanh BĐS",
            company: "RealEstate Plus",
            place: "Đà Nẵng",
            salary: "20–35 triệu",
            tags: ["Bất động sản", "Tư vấn"],
         },
      ],
   },
];

const fallbackFeaturedCompanies: HomeCompany[] = [
   {
      name: "NovaTech",
      rating: "4.8",
      employees: "500-1000",
      location: "TP. HCM",
      openJobs: 24,
      color: "#059669",
      initial: "N",
      avatar: typeof companyLogo1 === 'string' ? companyLogo1 : (companyLogo1 as any).src,
      category: "Technology",
   },
   {
      name: "BluePixel",
      rating: "4.7",
      employees: "100-500",
      location: "Hà Nội",
      openJobs: 12,
      color: "#0284c7",
      initial: "B",
      avatar: typeof companyLogo7 === 'string' ? companyLogo7 : (companyLogo7 as any).src,
      category: "Design",
   },
   {
      name: "ScaleHub",
      rating: "4.9",
      employees: "1000+",
      location: "Đà Nẵng",
      openJobs: 18,
      color: "#7c3aed",
      initial: "S",
      avatar: typeof companyLogo8 === 'string' ? companyLogo8 : (companyLogo8 as any).src,
      category: "Technology",
   },
   {
      name: "CloudWorks",
      rating: "4.6",
      employees: "200-500",
      location: "TP. HCM",
      openJobs: 15,
      color: "#ea580c",
      initial: "C",
      avatar: typeof companyLogo4 === 'string' ? companyLogo4 : (companyLogo4 as any).src,
      category: "Technology",
   },
];

const fallbackRecruitmentTrendData: RecruitmentTrendPoint[] = [
   { month: "T1", jobs: 450, companies: 85, salary: 28 },
   { month: "T2", jobs: 520, companies: 92, salary: 29 },
   { month: "T3", jobs: 580, companies: 102, salary: 30 },
   { month: "T4", jobs: 720, companies: 118, salary: 31 },
   { month: "T5", jobs: 890, companies: 135, salary: 33 },
   { month: "T6", jobs: 1050, companies: 156, salary: 34 },
];

const fallbackJobDistributionData: DistributionPoint[] = [
   { name: "Công nghệ", value: 780, color: "#059669" },
   { name: "Marketing", value: 450, color: "#0284c7" },
   { name: "Thiết kế", value: 320, color: "#7c3aed" },
   { name: "Nhân sự", value: 280, color: "#ea580c" },
   { name: "Bán hàng", value: 370, color: "#facc15" },
];

const fallbackSalaryByPositionData: SalaryPoint[] = [
   { position: "Intern", salary: 5, applicants: 450, color: "#60a5fa" },
   { position: "Junior", salary: 12, applicants: 680, color: "#34d399" },
   { position: "Senior", salary: 28, applicants: 320, color: "#7c3aed" },
   { position: "Lead", salary: 40, applicants: 180, color: "#f59e0b" },
   { position: "Manager", salary: 50, applicants: 120, color: "#fb7185" },
];

const companyHighlights = [
   {
      title: "Công ty đã xác minh",
      desc: "Nhà tuyển dụng được kiểm duyệt trước khi đăng tin.",
      accent: "#059669",
      icon: ShieldCheck,
   },
   {
      title: "Phủ sóng 34 tỉnh thành",
      desc: "Cơ hội việc làm rộng khắp, dễ chọn nơi làm phù hợp.",
      accent: "#0284c7",
      icon: Compass,
   },
   {
      title: "Minh bạch thu nhập",
      desc: "Khoảng lương hiển thị rõ trước khi bạn ứng tuyển.",
      accent: "#7c3aed",
      icon: Wallet,
   },
];

const fallbackBannerMarketStats: MarketStat[] = [
   { label: "Việc mới hôm nay", value: "25", accent: "#f59e0b" },
   { label: "Việc làm đang tuyển", value: "320+", accent: "#22c55e" },
   { label: "Doanh nghiệp nổi bật", value: "4", accent: "#6366f1" },
];

const industryColors = ["#059669", "#0284c7", "#7c3aed", "#ea580c", "#f59e0b"];
const fallbackCompanyLogos = [companyLogo1, companyLogo7, companyLogo8, companyLogo4].map((logo) =>
   typeof logo === "string" ? logo : (logo as { src?: string }).src || "",
);

const resolveAssetUrl = (value?: string): string | undefined => {
   const source = value?.trim();
   if (!source) return undefined;
   if (/^(https?:|data:|blob:)/i.test(source)) return source;
   return `${API_URL}${source.startsWith("/") ? "" : "/"}${source}`;
};

const jobKey = (industryName: string, job: HomeJob): string =>
   job.id ? `job:${job.id}` : `${industryName}-${job.company}-${job.title}`;

const readStoredApplicationKeys = (): Set<string> => {
   const keys = new Set<string>();
   if (typeof window === "undefined") return keys;

   try {
      const raw = localStorage.getItem("jobpilot_applications");
      const stored = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(stored)) return keys;

      stored.filter(Boolean).forEach((item: any) => {
         const apiJobId = item.jobId ?? item.job?.id;
         if (apiJobId) keys.add(`job:${apiJobId}`);
         if (item.industry && item.company && item.title) {
            keys.add(`${item.industry}-${item.company}-${item.title}`);
         }
         if (typeof item.id === "string") keys.add(item.id);
      });
   } catch {
      return keys;
   }

   return keys;
};

const mapApiJob = (job: ApiJob): HomeJob => ({
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

const mapRecommendation = (job: JobRecommendation): HomeJob => ({
   id: job.jobId,
   slug: job.slug,
   title: toVietnameseJobTitle(job.title),
   company: cleanApiText(job.company?.name) || "Doanh nghiệp đang cập nhật",
   companySlug: job.company?.slug,
   place: cleanApiText(job.locationCity) || cleanApiText(job.locationAddress) || "Địa điểm linh hoạt",
   salary: formatSalaryRange(job.salaryMin, job.salaryMax),
   industry: "Gợi ý phù hợp với CV",
   tags: (job.matchedSkills.length ? job.matchedSkills : [job.jobLevel, job.jobType])
      .filter((tag): tag is string => Boolean(tag))
      .slice(0, 3),
});

const buildIndustryGroups = (jobs: ApiJob[]): HomeIndustry[] => {
   const grouped = new Map<string, HomeJob[]>();
   jobs.forEach((job) => {
      const mapped = mapApiJob(job);
      const group = grouped.get(mapped.industry!) ?? [];
      group.push(mapped);
      grouped.set(mapped.industry!, group);
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

const buildRecruitmentTrend = (jobs: ApiJob[]): RecruitmentTrendPoint[] => {
   const now = new Date();
   const months = Array.from({ length: 6 }, (_, index) =>
      new Date(now.getFullYear(), now.getMonth() - 5 + index, 1),
   );

   return months.map((month) => {
      const monthlyJobs = jobs.filter((job) => {
         const createdAt = job.createdAt ? new Date(job.createdAt) : null;
         return createdAt
            && !Number.isNaN(createdAt.getTime())
            && createdAt.getFullYear() === month.getFullYear()
            && createdAt.getMonth() === month.getMonth();
      });
      const salaries = monthlyJobs
         .map((job) => {
            const values = [job.salaryMin, job.salaryMax]
               .filter((value): value is number => typeof value === "number" && value > 0)
               .map((value) => value >= 100_000 ? value / 1_000_000 : value);
            return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
         })
         .filter((value) => value > 0);

      return {
         month: `T${month.getMonth() + 1}`,
         jobs: monthlyJobs.length,
         companies: new Set(monthlyJobs.map((job) => job.company?.id ?? job.company?.name).filter(Boolean)).size,
         salary: salaries.length
            ? Math.round(salaries.reduce((sum, value) => sum + value, 0) / salaries.length)
            : 0,
      };
   });
};

const buildJobDistribution = (jobs: ApiJob[]): DistributionPoint[] => {
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

const buildSalaryByPosition = (jobs: ApiJob[]): SalaryPoint[] => {
   const groups = new Map<string, number[]>();
   jobs.forEach((job) => {
      const salaryValues = [job.salaryMin, job.salaryMax]
         .filter((value): value is number => typeof value === "number" && value > 0)
         .map((value) => value >= 100_000 ? value / 1_000_000 : value);
      if (!salaryValues.length) return;
      const level = cleanApiText(job.jobLevel) || "Khác";
      const midpoint = salaryValues.reduce((sum, value) => sum + value, 0) / salaryValues.length;
      groups.set(level, [...(groups.get(level) ?? []), midpoint]);
   });

   return Array.from(groups.entries())
      .sort((left, right) => right[1].length - left[1].length)
      .slice(0, 5)
      .map(([position, salaries], index) => ({
         position,
         salary: Math.round((salaries.reduce((sum, value) => sum + value, 0) / salaries.length) * 10) / 10,
         color: industryColors[index % industryColors.length],
      }));
};

const mapApiCompany = (company: ApiCompany, index: number): HomeCompany => ({
   name: company.name,
   slug: company.slug,
   employees: cleanApiText(company.size) || "Đang cập nhật",
   location: cleanApiText(company.headquarters)
      || cleanApiText(company.positions?.find((job) => job.locationCity)?.locationCity)
      || "Đang cập nhật",
   openJobs: company.positions?.length ?? 0,
   color: company.color || industryColors[index % industryColors.length],
   initial: company.name.slice(0, 1).toUpperCase(),
   avatar: resolveAssetUrl(company.logoUrl) || fallbackCompanyLogos[index % fallbackCompanyLogos.length],
   category: cleanApiText(company.industry) || "Lĩnh vực đang cập nhật",
});

function CompanyCard({ company }: { company: HomeCompany }) {
   return (
      <Link
         href={company.slug ? `/cong-ty/${company.slug}` : "/cong-ty"}
         className="group relative overflow-hidden rounded-[20px] border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      >
         <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
               <div
                  className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-transparent border border-slate-100"
               >
                  {company.avatar ? (
                     <img src={company.avatar} alt={company.name} className="h-full w-full object-cover" />
                  ) : (
                     <span className="font-bold text-white" style={{ color: company.color }}>
                        {company.initial}
                     </span>
                  )}
               </div>
               <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{company.name}</h3>
                  <p className="mt-1 text-xs text-slate-700">{company.category}</p>
               </div>
            </div>
            {company.rating && (
               <div className="flex items-center gap-1 rounded-full bg-transparent border border-amber-100/40 px-2 py-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-bold text-amber-700">{company.rating}</span>
               </div>
            )}
         </div>
         <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
               <MapPin className="h-3.5 w-3.5 text-gray-400" />
               <span className="text-xs">{company.location}</span>
            </div>
            <div className="flex items-center gap-2">
               <Users className="h-3.5 w-3.5 text-gray-400" />
               <span className="text-xs">{company.employees}</span>
            </div>
         </div>
         <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-700">{company.openJobs} việc mở</p>
         </div>
      </Link>
   );
}

function TopIndustryCard({
   industry,
   appliedJobIds,
   onApply,
}: {
   industry: HomeIndustry;
   appliedJobIds: Set<string>;
   onApply: (industryName: string, job: HomeJob) => void;
}) {
   return (
      <div className="rounded-[24px] border border-gray-200/80 bg-white p-6 shadow-sm">
         <div className="flex items-center gap-3 mb-4">
            <div
               className="h-3 w-3 rounded-full"
               style={{ backgroundColor: industry.color }}
            />
            <h3 className="text-lg font-bold text-gray-900">{industry.industry}</h3>
         </div>
         <div className="space-y-3">
            {industry.jobs.map((job) => (
               <div key={jobKey(industry.industry, job)} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                     <div className="flex-1">
                        <Link
                           href={job.slug ? `/tim-viec/${job.slug}` : "/tim-viec"}
                           className="font-semibold text-gray-900 text-sm hover:text-emerald-700"
                        >
                           {job.title}
                        </Link>
                        <p className="text-xs text-slate-700 mt-1">{job.company}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                           <span className="inline-flex items-center gap-2 rounded-full bg-transparent border border-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              <MapPin className="h-3 w-3 text-slate-600" />
                              {job.place}
                           </span>
                           <span className="inline-flex items-center gap-2 rounded-full bg-transparent border border-emerald-100/40 px-3 py-1 text-xs font-semibold text-emerald-700">
                              <Wallet className="h-3 w-3 text-emerald-600" />
                              {job.salary}
                           </span>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-3">
                     {job.tags.map((tag) => (
                        <span
                           key={tag}
                           className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-slate-700 border border-gray-200"
                        >
                           {tag}
                        </span>
                     ))}
                  </div>
                  <button
                     type="button"
                     onClick={() => onApply(industry.industry, job)}
                     disabled={appliedJobIds.has(jobKey(industry.industry, job))}
                     className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                     {appliedJobIds.has(jobKey(industry.industry, job)) ? "Đã ứng tuyển" : "Ứng tuyển"}
                  </button>
               </div>
            ))}
         </div>
         <Link
            href="/tim-viec"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-slate-800 hover:text-slate-900 transition-colors"
         >
            Xem thêm <ArrowRight className="h-4 w-4" />
         </Link>
      </div>
   );
}

export default function HomePage() {
   const [topIndustryJobs, setTopIndustryJobs] = useState<HomeIndustry[]>(fallbackTopIndustryJobs);
   const [featuredCompanies, setFeaturedCompanies] = useState<HomeCompany[]>(fallbackFeaturedCompanies);
   const [recruitmentTrendData, setRecruitmentTrendData] = useState<RecruitmentTrendPoint[]>(fallbackRecruitmentTrendData);
   const [jobDistributionData, setJobDistributionData] = useState<DistributionPoint[]>(fallbackJobDistributionData);
   const [salaryByPositionData, setSalaryByPositionData] = useState<SalaryPoint[]>(fallbackSalaryByPositionData);
   const [bannerMarketStats, setBannerMarketStats] = useState<MarketStat[]>(fallbackBannerMarketStats);
   const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(readStoredApplicationKeys);
   const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
   const [applyingJob, setApplyingJob] = useState<{ industryName: string; job: HomeJob } | null>(null);

   useEffect(() => {
      let cancelled = false;

      const loadHomepageData = async () => {
         const authUser = readAuthUser();
         const cvId = getActiveCvId();
         const recommendationRequest = authUser && cvId
            ? recommendationsApi.forCv({ cvId, limit: 3 })
            : Promise.resolve(null);
         const applicationRequest: Promise<ApiApplication[] | null> = authUser
            ? applicationsApi.listMine()
            : Promise.resolve(null);

         const [jobsResult, companiesResult, recommendationsResult, applicationsResult] = await Promise.allSettled([
            jobsApi.list({ offset: 0, limit: 100 }),
            companiesApi.list({ offset: 0, limit: 100, completeOnly: true }),
            recommendationRequest,
            applicationRequest,
         ]);
         if (cancelled) return;

         const apiJobs = jobsResult.status === "fulfilled" ? jobsResult.value : [];
         const apiCompanies = companiesResult.status === "fulfilled" ? companiesResult.value : [];
         const recommendedJobs = recommendationsResult.status === "fulfilled"
            ? recommendationsResult.value?.recommendations ?? []
            : [];
         const recommendationGroup: HomeIndustry[] = recommendedJobs.length
            ? [{
               industry: "Gợi ý phù hợp với CV",
               color: "#059669",
               jobs: recommendedJobs.map(mapRecommendation),
            }]
            : [];

         if (apiJobs.length) {
            const industryGroups = buildIndustryGroups(apiJobs);
            setTopIndustryJobs([...recommendationGroup, ...industryGroups]
               .filter((group) => group.jobs.length > 0)
               .slice(0, 3));
            setRecruitmentTrendData(buildRecruitmentTrend(apiJobs));
            const distribution = buildJobDistribution(apiJobs);
            const salaryByPosition = buildSalaryByPosition(apiJobs);
            setJobDistributionData(distribution.length ? distribution : fallbackJobDistributionData);
            setSalaryByPositionData(salaryByPosition.length ? salaryByPosition : fallbackSalaryByPositionData);
         } else if (jobsResult.status === "rejected") {
            console.warn("Không thể tải dữ liệu việc làm cho homepage, đang dùng dữ liệu dự phòng.", jobsResult.reason);
            if (recommendationGroup.length) {
               setTopIndustryJobs([...recommendationGroup, ...fallbackTopIndustryJobs].slice(0, 3));
            }
         }

         if (apiCompanies.length) {
            const companies = [...apiCompanies]
               .sort((left, right) => Number(Boolean(right.isFeatured)) - Number(Boolean(left.isFeatured))
                  || (right.positions?.length ?? 0) - (left.positions?.length ?? 0))
               .slice(0, 4)
               .map(mapApiCompany);
            setFeaturedCompanies(companies);
         } else if (companiesResult.status === "rejected") {
            console.warn("Không thể tải dữ liệu công ty cho homepage, đang dùng dữ liệu dự phòng.", companiesResult.reason);
         }

         const today = new Date();
         const newJobsToday = apiJobs.filter((job) => {
            if (!job.createdAt) return false;
            const createdAt = new Date(job.createdAt);
            return !Number.isNaN(createdAt.getTime())
               && createdAt.getFullYear() === today.getFullYear()
               && createdAt.getMonth() === today.getMonth()
               && createdAt.getDate() === today.getDate();
         }).length;
         setBannerMarketStats([
            jobsResult.status === "fulfilled"
               ? { label: "Việc mới hôm nay", value: String(newJobsToday), accent: "#f59e0b" }
               : fallbackBannerMarketStats[0],
            jobsResult.status === "fulfilled"
               ? { label: "Việc làm đang tuyển", value: `${apiJobs.length}${apiJobs.length === 100 ? "+" : ""}`, accent: "#22c55e" }
               : fallbackBannerMarketStats[1],
            companiesResult.status === "fulfilled"
               ? { label: "Doanh nghiệp đầy đủ hồ sơ", value: `${apiCompanies.length}${apiCompanies.length === 100 ? "+" : ""}`, accent: "#6366f1" }
               : fallbackBannerMarketStats[2],
         ]);

         if (applicationsResult.status === "fulfilled" && applicationsResult.value) {
            setAppliedJobIds((current) => {
               const next = new Set(current);
               applicationsResult.value?.forEach((application) => {
                  if (application.job?.id) next.add(`job:${application.job.id}`);
               });
               return next;
            });
         }
      };

      void loadHomepageData();
      return () => {
         cancelled = true;
      };
   }, []);

   useEffect(() => {
      if (!toast) {
         return;
      }

      const timeoutId = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timeoutId);
   }, [toast]);

   const showToast = (message: string, kind: "success" | "error" = "success") => {
      setToast({ message, kind });
   };

   const handleApplyJob = (industryName: string, job: HomeJob) => {
      if (!readAuthUser()) {
         showToast("Bạn cần đăng nhập trước khi ứng tuyển.", "error");
         return;
      }

      if (!hasCreatedCv()) {
         showToast("Bạn chưa có CV. Vui lòng tạo CV trước khi ứng tuyển.", "error");
         return;
      }

      const key = jobKey(industryName, job);
      if (appliedJobIds.has(key)) {
         showToast("Bạn đã ứng tuyển vị trí này rồi.", "error");
         return;
      }

      setApplyingJob({ industryName, job });
   };

   const handleConfirmApply = async (cvId: number) => {
      if (!applyingJob) return;
      const { industryName, job } = applyingJob;
      setApplyingJob(null);

      const key = jobKey(industryName, job);
      if (appliedJobIds.has(key)) {
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
         const raw = localStorage.getItem("jobpilot_applications");
         const current = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
         const filteredCurrent = (Array.isArray(current) ? current : []).filter(Boolean);
         const updated = [application, ...filteredCurrent.filter((item) =>
            item && item.id !== id && (!job.id || item.jobId !== job.id),
         )];
         localStorage.setItem("jobpilot_applications", JSON.stringify(updated));
         window.dispatchEvent(new Event("jobpilot-data-updated"));
      } catch (error) {
         console.error("Không thể đồng bộ hồ sơ ứng tuyển vào localStorage.", error);
      }
      setAppliedJobIds((prev) => new Set([...prev, key]));
      showToast(`Đã ứng tuyển thành công: ${job.title} tại ${job.company}.`);
   };

   return (
      <div className="space-y-12">
         {/* ===== BANNER SECTION ===== */}
         <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
            <div className="home-banner-orb home-banner-orb-1" />
            <div className="home-banner-orb home-banner-orb-2" />

            <div className="relative grid gap-6 lg:grid-cols-3 items-center lg:items-center">
               <div className="space-y-6 lg:col-span-3 text-center mx-auto max-w-3xl">
                  <div className="space-y-7">
                     <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                        Ứng tuyển nhanh, việc làm tốt
                     </h1>
                     <p className="text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl mx-auto">
                        JobPilot giúp bạn kết nối với các công ty uy tín, nhận gợi ý việc phù hợp từng ngày, và tối ưu hồ sơ để ứng tuyển hiệu quả.
                     </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-5">
                     <Link href="/tim-viec" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                        Khám phá việc làm <ArrowRight className="h-4 w-4" />
                     </Link>
                     <Link href="/dang-ky" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition-all hover:border-slate-400">
                        Tạo tài khoản miễn phí
                     </Link>
                  </div>

                  <div className="pt-4 grid grid-cols-3 gap-3 md:gap-4 justify-items-center">
                     {bannerMarketStats.map((stat) => (
                        <div key={stat.label} className="group rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 md:p-4 transition-all hover:shadow-md text-center">
                           <p className="text-xs md:text-[11px] uppercase tracking-widest text-slate-600 font-semibold">{stat.label}</p>
                           <p className="mt-2 text-xl md:text-2xl " style={{ color: stat.accent }}>{stat.value}</p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </section>

         {/* ===== RECRUITMENT STATISTICS SECTION ===== */}
         <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
               <div className="flex items-start gap-3">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                        Tình hình tuyển dụng hiện tại
                     </h2>
                  </div>
               </div>
            </div>

            <div className="grid gap-6">
               <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
                  <div className="flex items-start gap-3">
                     <div>
                        <h3 className="text-lg font-bold text-slate-900">Biểu đồ tăng trưởng</h3>
                        <p className="mt-0.5 text-sm text-slate-700">Số lượng việc làm mới và công ty tuyển dụng mỗi tháng</p>
                     </div>
                  </div>

                  <div className="mt-6">
                     <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={recruitmentTrendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                           <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                           <XAxis dataKey="month" />
                           <YAxis />
                           <Tooltip
                              contentStyle={{
                                 backgroundColor: "#fff",
                                 border: "1px solid #e2e8f0",
                                 borderRadius: "8px",
                              }}
                           />
                           <Legend />
                           <Line
                              type="monotone"
                              dataKey="jobs"
                              stroke="#059669"
                              name="Số việc làm"
                              strokeWidth={2}
                              dot={{ fill: "#059669", r: 4 }}
                           />
                           <Line
                              type="monotone"
                              dataKey="companies"
                              stroke="#0284c7"
                              name="Số công ty tuyển"
                              strokeWidth={2}
                              dot={{ fill: "#0284c7", r: 4 }}
                           />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
                     <div className="flex items-start gap-3">
                        <div>
                           <h3 className="text-lg font-bold text-slate-900">Phân bố việc làm theo ngành</h3>
                        </div>
                     </div>

                     <div className="mt-6">
                        <ResponsiveContainer width="100%" height={250}>
                           <PieChart>
                              <Pie
                                 data={jobDistributionData}
                                 cx="50%"
                                 cy="50%"
                                 labelLine={false}
                                 label={({ name, value }: any) => `${name}: ${value}`}
                                 outerRadius={80}
                                 fill="#8884d8"
                                 dataKey="value"
                              >
                                 {jobDistributionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                              </Pie>
                              <Tooltip />
                           </PieChart>
                        </ResponsiveContainer>
                     </div>
                  </div>

                  <div className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-12 md:px-8">
                     <div className="flex items-start gap-3">
                        <div>
                           <h3 className="text-lg font-bold text-slate-900">Mức lương trung bình</h3>
                        </div>
                     </div>

                     <div className="mt-6">
                        <ResponsiveContainer width="100%" height={250}>
                           <BarChart data={salaryByPositionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                              <XAxis dataKey="position" />
                              <YAxis />
                              <Tooltip
                                 contentStyle={{
                                    backgroundColor: "#fff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                 }}
                              />
                              <Bar dataKey="salary" name="Lương (triệu)" radius={[8, 8, 0, 0]}>
                                 {salaryByPositionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                              </Bar>
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            </div>
         </section>

         {/* ===== FEATURED COMPANIES SECTION ===== */}
         <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
               <div className="flex items-start gap-3">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                        Doanh nghiệp uy tín, chất lượng
                     </h2>
                  </div>
               </div>
               <Link href="/cong-ty" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex-shrink-0">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
               </Link>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
               {featuredCompanies.map((company) => (
                  <CompanyCard key={company.name} company={company} />
               ))}
            </div>
         </section>

         {/* ===== COMPANY HIGHLIGHTS ===== */}
         <div className="flex items-start gap-3 mb-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Tại sao nên tìm việc qua JobPilot?</h2>
         </div>
         <section className="rounded-[12px] border border-gray-200/80 bg-white px-6 py-8 md:px-8">
            <div className="grid gap-6 md:grid-cols-3">
               {companyHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                     <article key={item.title} className="rounded-[12px] border border-gray-200/80 bg-white p-6 shadow-sm text-center">
                        <div className="flex flex-col items-center gap-4">
                           <div className="h-16 w-16 flex items-center justify-center rounded-full border border-slate-200">
                              <Icon className="h-8 w-8" style={{ color: item.accent }} />
                           </div>
                           <div>
                              <h4 className="text-lg font-semibold text-slate-900">{item.title}</h4>
                              <p className="mt-2 text-sm text-slate-600 max-w-[22rem] mx-auto">{item.desc}</p>
                           </div>
                        </div>
                     </article>
                  );
               })}
            </div>
         </section>

         {/* ===== TOP INDUSTRY JOBS ===== */}
         <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
               <div className="flex items-start gap-3">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                        Cơ hội việc làm top ngành nghề
                     </h2>
                  </div>
               </div>
               <Link href="/tim-viec" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors flex-shrink-0">
                  Xem tất cả <ArrowRight className="h-4 w-4" />
               </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
               {topIndustryJobs.map((industry) => (
                  <TopIndustryCard
                     key={industry.industry}
                     industry={industry}
                     appliedJobIds={appliedJobIds}
                     onApply={handleApplyJob}
                  />
               ))}
            </div>
         </section>

         {/* ===== CTA SECTION ===== */}
         <section className="rounded-[16px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-6 py-8 shadow-[0_4px_16px_rgba(16,185,129,0.08)] md:px-10 md:py-12">
            <div className="space-y-6 lg:space-y-4 lg:flex lg:items-center lg:justify-between">
               <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                     Bắt đầu hành trình tìm việc
                  </h2>
                  <p className="mt-4 text-base leading-7 text-emerald-800 max-w-xl">
                     Đăng ký miễn phí để lưu việc làm, theo dõi công ty yêu thích và sử dụng công cụ hỗ trợ tìm việc của JobPilot.
                  </p>
               </div>
               <Link
                  href="/dang-ky"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-semibold text-white shadow transition-colors lg:shrink-0"
               >
                  Đăng ký tài khoản
               </Link>
            </div>
         </section>

         {/* ===== QUICK LINKS ===== */}
         <section>
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
               <div className="flex items-start gap-3">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                        Khám phá các chuyên mục
                     </h2>
                  </div>
               </div>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
               {quickLinks.map((item) => {
                  const Icon = item.icon;
                  return (
                     <Link key={item.to} href={item.to} className="group">
                        <article className="rounded-[12px] border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                           <div className="flex flex-col items-center text-center gap-4">
                              <div className="h-14 w-14 flex items-center justify-center rounded-full border border-slate-200">
                                 <Icon className="h-7 w-7" style={{ color: item.accent }} />
                              </div>
                              <div>
                                 <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                 <p className="mt-2 text-sm leading-6 text-slate-600">{item.desc}</p>
                              </div>
                              <span className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-transform duration-200 group-hover:translate-x-1">
                                 Xem ngay <ArrowRight className="h-4 w-4" />
                              </span>
                           </div>
                        </article>
                     </Link>
                  );
               })}
            </div>
         </section>

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

         <ApplyCvModal
            isOpen={applyingJob !== null}
            onClose={() => setApplyingJob(null)}
            onConfirm={handleConfirmApply}
         />
      </div>
   );
}
