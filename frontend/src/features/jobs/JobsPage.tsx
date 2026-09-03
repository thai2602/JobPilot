'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "../../config/env";
import { generateSlug } from "../../utils/slug";
import { Clock3, MapPin, Wallet, Search, Flame, Bookmark, X, CalendarClock, SlidersHorizontal, Briefcase, Award, CheckCircle2 } from "lucide-react";
import { companyAvatars as fallbackImages } from "../companies/companyAssets";
import { mockCompanies as companiesCatalog } from "../companies/mockCompanies";
import { mockJobs as jobs, Job } from "./mockJobs";
import { readAuthUser } from "../../utils/auth";
import { hasCreatedCv } from "../../utils/cv";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import ApplyCvModal from "../../components/ApplyCvModal";
import { jobsApi, type ApiJob } from "../../services/jobsApi";
import { applicationsApi } from "../../services/applicationsApi";
import { savedJobsApi } from "../../services/savedJobsApi";
import { cleanApiText } from "../../utils/content";
import { formatSalaryRange } from "../../utils/salary";

const APPLICATIONS_STORAGE_KEY = "jobpilot_applications";
const SAVED_JOBS_STORAGE_KEY = "jobpilot_saved_jobs";
const DATA_UPDATED_EVENT = "jobpilot-data-updated";

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

const savedJobMatches = (savedJob: any, job: any): boolean => {
   const savedJobId = Number(savedJob?.jobId);
   const jobId = Number(job?.id);
   if (Number.isFinite(savedJobId) && Number.isFinite(jobId) && savedJobId === jobId) return true;
   return normalizedText(savedJob?.company) === normalizedText(job?.company)
      && normalizedText(savedJob?.title) === normalizedText(job?.title);
};

const getSavedRecordId = (savedJob: any): number | undefined => {
   const explicitId = Number(savedJob?.serverId);
   if (Number.isInteger(explicitId) && explicitId > 0) return explicitId;
   const id = String(savedJob?.id ?? "");
   if (!id.startsWith("api-saved-")) return undefined;
   const parsed = Number(id.slice("api-saved-".length));
   return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const levelMap: Record<string, string> = {
   NHAN_VIEN: "Nhân viên",
   THUC_TAP_SINH: "Thực tập sinh",
   TRUONG_NHOM: "Trưởng nhóm",
   QUAN_LY_GIAM_SAT: "Quản lý/Giám sát",
   TRUONG_PHO_PHONG: "Trưởng/Phó phòng",
   GIAM_DOC: "Giám đốc",
   PHO_GIAM_DOC: "Phó giám đốc",
   TRUONG_CHI_NHANH: "Trưởng chi nhánh",
};

const jobTypeOptions = [
   { value: "FULL_TIME", label: "Toàn thời gian" },
   { value: "PART_TIME", label: "Bán thời gian" },
   { value: "INTERNSHIP", label: "Thực tập" },
];

const locationOptions = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Toàn Quốc"];

const formatJobType = (value?: string): string => ({
   FULL_TIME: "Toàn thời gian",
   PART_TIME: "Bán thời gian",
   INTERNSHIP: "Thực tập",
   CONTRACT: "Hợp đồng",
   HYBRID: "Hybrid",
   REMOTE: "Remote",
}[value || ""] ?? "Đang cập nhật");

const formatExperience = (value?: string): string => {
   const normalized = String(value ?? "").trim();
   if (!normalized) return "Kinh nghiệm chưa cập nhật";
   if (/không\s*yêu\s*cầu/i.test(normalized)) return "Không yêu cầu kinh nghiệm";
   if (/(năm|tháng|kinh nghiệm)/i.test(normalized)) return normalized;
   return `${normalized} năm kinh nghiệm`;
};

const formatLocation = (city?: string, address?: string): string => {
   const source = `${city ?? ""} ${address ?? ""}`;
   if (/hà nội/i.test(source)) return "Hà Nội";
   if (/(hồ chí minh|tp\.?\s*hcm|thành phố hồ chí minh)/i.test(source)) return "Hồ Chí Minh";
   if (/đà nẵng/i.test(source)) return "Đà Nẵng";
   if (/toàn quốc/i.test(source)) return "Toàn Quốc";
   return cleanApiText(city) || "Việt Nam";
};

const canonicalLocation = (value?: string): string =>
   String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/tp\.?\s*hcm|thanh pho ho chi minh/g, "ho chi minh")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

const fieldNameMap: Record<string, string> = {
   "Technology": "Công nghệ thông tin",
   "Ecommerce": "Kinh doanh/Bán hàng",
   "Healthcare": "Nhóm ngành khác",
   "Finance": "Tài chính/Ngân hàng",
   "Design": "Marketing/Quảng cáo",
   "Education": "Nhóm ngành khác",
   "Gaming": "Công nghệ thông tin",
   "Logistics": "Logistics/Kho vận",
   "Manufacturing": "Lao động phổ thông",
   "Consulting": "Kinh doanh/Bán hàng",
   "Real Estate": "Bất động sản",
   "Automotive": "Tài xế",
   "Food & Beverage": "Lao động phổ thông",
   "Travel": "Tài xế",
   "Energy": "Xây dựng",
   "Fashion": "Marketing/Quảng cáo",
   "Agriculture": "Lao động phổ thông",
};

const toVietnameseField = (field: string) => fieldNameMap[field] ?? "Nhóm ngành khác";

const seedJobsFromKnownCompanies: Job[] = jobs
   .filter((job) => companiesCatalog.some((company) => company.name === job.company))
   .map((job) => ({ ...job, title: toVietnameseJobTitle(job.title), field: toVietnameseField(job.field) }));

const companyJobsFromCatalog: Job[] = companiesCatalog.flatMap((company, companyIndex) => {
   const displayField = toVietnameseField(company.field);

   return company.positions.map((position, positionIndex) => ({
      title: toVietnameseJobTitle(position.title),
      company: company.name,
      companyColor: company.color,
      companyDescription: company.description,
      description: position.description,
      place: company.location,
      field: displayField,
      type: positionIndex % 3 === 0 ? "Full-time" : positionIndex % 3 === 1 ? "Hybrid" : "Remote",
      salary: position.salary,
      tags: position.skills,
      hot: positionIndex === 0,
      posted: "Mới cập nhật",
      image: fallbackImages[companyIndex % fallbackImages.length],
      companyUrl: "/cong-ty",
   }));
});

export const companyJobs: Job[] = [
   ...seedJobsFromKnownCompanies,
   ...companyJobsFromCatalog,
].filter((job, index, list) => list.findIndex((item) => item.company === job.company && item.title === job.title) === index);

const hiringPromotions = [
   {
      title: "Tuần lễ tuyển dụng IT 2026",
      subtitle: "200+ vị trí Frontend, Backend, Product",
      description: "Kết nối trực tiếp với nhà tuyển dụng công nghệ lớn, phỏng vấn nhanh trong 24h và nhận phản hồi hồ sơ ngay trong sự kiện. Ứng viên còn được tư vấn định hướng nghề nghiệp, chuẩn hóa CV theo từng vị trí và tham gia phiên hỏi đáp cùng các trưởng nhóm kỹ thuật.",
      cta: "Khám phá sự kiện",
      accent: "from-indigo-600 to-violet-600",
      accentBorder: "border-indigo-100",
      textAccent: "text-indigo-600",
   },
   {
      title: "Top công ty hybrid linh hoạt",
      subtitle: "Mô hình làm việc 2-3 ngày tại văn phòng",
      description: "Danh sách doanh nghiệp có chính sách hybrid rõ ràng, phù hợp ứng viên trẻ muốn cân bằng hiệu suất và trải nghiệm cá nhân. Mỗi tin tuyển dụng đi kèm thông tin về thời gian làm việc, phúc lợi và lộ trình tăng trưởng trong 6-12 tháng. Đây có lẽ sẽ là xu hướng làm việc chính trong năm 2026.",
      cta: "Xem danh sách",
      accent: "from-emerald-600 to-teal-600",
      accentBorder: "border-emerald-100",
      textAccent: "text-emerald-600",
   },
   {
      title: "Mega Career Fair tháng 5",
      subtitle: "Workshop CV + phỏng vấn thử miễn phí",
      description: "Được review CV 1-1 bởi recruiter, tham gia chuỗi mini talk kỹ năng nghề nghiệp và thực hành phỏng vấn thử với bộ câu hỏi bám sát nhu cầu doanh nghiệp. Sự kiện ưu tiên các vị trí IT, Marketing, Sales và nhóm công việc đang tăng trưởng mạnh.",
      cta: "Đăng ký ngay",
      accent: "from-pink-600 to-rose-600",
      accentBorder: "border-pink-100",
      textAccent: "text-pink-600",
   },
];

const jobArticles = [
   {
      title: "5 cách tối ưu CV cho vị trí Frontend React Developer",
      category: "CV & Portfolio",
      readTime: "8 phút đọc",
      summary: "Các mục cần nhấn mạnh trong CV công nghệ để tăng tỉ lệ qua vòng lọc hồ sơ, từ cấu trúc dự án đến cách mô tả impact bằng số liệu. Bài viết kèm ví dụ thực tế cho Fresher và Mid-level.",
      image: fallbackImages[0],
   },
   {
      title: "Checklist chuẩn bị phỏng vấn cho ứng viên trái ngành",
      category: "Phỏng vấn",
      readTime: "6 phút đọc",
      summary: "Danh sách các câu hỏi thường gặp và cách trả lời thuyết phục với recruiter, đặc biệt cho ứng viên chuyển ngành. Có mẫu câu trả lời STAR, checklist luyện tập và lỗi cần tránh trước vòng phỏng vấn cuối.",
      image: fallbackImages[1],
   },
   {
      title: "Xu hướng lương ngành IT, Marketing, Sales năm 2026",
      category: "Báo cáo thị trường",
      readTime: "10 phút đọc",
      summary: "Tổng hợp mức lương theo vị trí và kinh nghiệm tại các thành phố lớn, bao gồm biên độ lương theo cấp bậc và kỹ năng. Dữ liệu cập nhật theo nhóm ngành để bạn đặt kỳ vọng đàm phán phù hợp hơn.",
      image: fallbackImages[2],
   },
];

export default function JobsPage() {
   const router = useRouter();
   const [applications, setApplications] = useState<any[]>([]);
   const [savedJobs, setSavedJobs] = useState<any[]>([]);
   const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
   const [savingJobKey, setSavingJobKey] = useState<string | null>(null);
   const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
   const [applyingJob, setApplyingJob] = useState<any | null>(null);

   const API_BASE = API_URL;

   const handleLogoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      e.currentTarget.src = (fallbackImages[0] as any)?.src || "";
   };

   const getLogoUrl = (imgSrc: any) => {
      if (!imgSrc) return (fallbackImages[0] as any)?.src || "";
      if (typeof imgSrc !== "string") return (imgSrc as any)?.src || "";
      if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://") || imgSrc.startsWith("data:")) return imgSrc;
      return `${API_BASE}${imgSrc.startsWith("/") ? "" : "/"}${imgSrc}`;
   };

   // --- API jobs state & Pagination ---
   const [apiJobs, setApiJobs] = useState<Job[]>([]);
   const [offset, setOffset] = useState(0);
   const [loadingMore, setLoadingMore] = useState(true);
   const [hasMore, setHasMore] = useState(true);
   const [isUsingFallback, setIsUsingFallback] = useState(false);

   // --- Filters State ---
   const [searchTerm, setSearchTerm] = useState("");
   const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
   const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
   const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
   const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

   const mapApiJobs = (apiData: ApiJob[]): Job[] => {
      return apiData.map((apiItem) => ({
         id: apiItem.id,
         title: apiItem.title,
         company: apiItem.company?.name || "",
         companyColor: apiItem.company?.color || "#0ea5e9",
         companyDescription: cleanApiText(apiItem.company?.description),
         description: cleanApiText(apiItem.description),
         requirements: cleanApiText(apiItem.requirements),
         benefits: cleanApiText(apiItem.benefits),
         place: formatLocation(apiItem.locationCity, apiItem.locationAddress),
         locationAddress: apiItem.locationAddress,
         field: toVietnameseField(apiItem.title),
         type: formatJobType(apiItem.jobType),
         salary: formatSalaryRange(apiItem.salaryMin, apiItem.salaryMax),
         tags: [
            apiItem.jobLevel ? (levelMap[apiItem.jobLevel] ?? apiItem.jobLevel) : null,
            apiItem.experienceYears ? formatExperience(apiItem.experienceYears) : null,
            formatLocation(apiItem.locationCity, apiItem.locationAddress),
         ].filter((t): t is string => Boolean(t)),
         hot: false,
         posted: "Vừa cập nhật",
         image: apiItem.company?.logoUrl || fallbackImages[0],
         companyUrl: `/cong-ty/${apiItem.company?.slug ?? ""}`,
         slug: apiItem.slug,
         jobLevel: apiItem.jobLevel,
         experienceYears: apiItem.experienceYears,
         expiredAt: apiItem.expiredAt,
      }));
   };

   // Debounce search term change
   useEffect(() => {
      const timer = setTimeout(() => {
         setDebouncedSearchTerm(searchTerm);
      }, 300);
      return () => clearTimeout(timer);
   }, [searchTerm]);

   // Fetch jobs when filters change
   useEffect(() => {
      setLoadingMore(true);

      jobsApi.list({
         offset: 0,
         limit: 6,
         search: debouncedSearchTerm || undefined,
         location: selectedLocation || undefined,
         jobType: selectedJobType || undefined,
         jobLevel: selectedLevel || undefined,
      })
         .then((apiData) => {
            const mapped = mapApiJobs(apiData);
            setApiJobs(mapped);
            setHasMore(apiData.length === 6);
            setOffset(6);
            setIsUsingFallback(false);
         })
         .catch((err) => {
            console.error("Lỗi tải API công việc, chuyển sang dữ liệu dự phòng:", err);
            // When entering fallback, populate apiJobs with the full local list so client-side filter can work on it
            const initialFallback = companyJobs.slice(0, 6);
            setApiJobs(initialFallback);
            setHasMore(companyJobs.length > 6);
            setOffset(6);
            setIsUsingFallback(true);
         })
         .finally(() => {
            setLoadingMore(false);
         });
   }, [debouncedSearchTerm, selectedLocation, selectedJobType, selectedLevel]);

   // Load more jobs
   const loadMoreJobs = () => {
      if (loadingMore || !hasMore) return;
      setLoadingMore(true);

      if (isUsingFallback) {
         setTimeout(() => {
            const nextBatch = companyJobs.slice(offset, offset + 6);
            if (nextBatch.length > 0) {
               setApiJobs((prev) => [...prev, ...nextBatch]);
               setOffset((prev) => prev + 6);
               setHasMore(companyJobs.length > offset + 6);
            } else {
               setHasMore(false);
            }
            setLoadingMore(false);
         }, 400);
         return;
      }

      jobsApi.list({
         offset,
         limit: 6,
         search: debouncedSearchTerm || undefined,
         location: selectedLocation || undefined,
         jobType: selectedJobType || undefined,
         jobLevel: selectedLevel || undefined,
      })
         .then((apiData) => {
            if (!apiData || apiData.length === 0) {
               setHasMore(false);
               return;
            }
            const mapped = mapApiJobs(apiData);
            setApiJobs((prev) => [...prev, ...mapped]);
            setOffset((prev) => prev + 6);
            setHasMore(apiData.length === 6);
         })
         .catch((err) => {
            console.error("Lỗi tải thêm công việc từ API, chuyển sang dữ liệu dự phòng:", err);
            const nextBatch = companyJobs.slice(offset, offset + 6);
            if (nextBatch.length > 0) {
               setApiJobs((prev) => [...prev, ...nextBatch]);
               setOffset((prev) => prev + 6);
               setHasMore(companyJobs.length > offset + 6);
            } else {
               setHasMore(false);
            }
         })
         .finally(() => {
            setLoadingMore(false);
         });
   };

   // Scroll listener removed for button-based loading

   const rawJobsList = apiJobs;

   // --- Instant Filter Logic ---
   const filteredJobs = isUsingFallback
      ? rawJobsList.filter(job => {
         // 1. Search term match (title, company, description, tags)
         const matchesSearch = searchTerm.trim() === "" ||
            job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

         // 2. Location match
         const matchesLocation = !selectedLocation ||
            canonicalLocation(job.place).includes(canonicalLocation(selectedLocation));

         // 3. Job Type match
         const matchesJobType = !selectedJobType ||
            job.type.toLowerCase() === formatJobType(selectedJobType).toLowerCase();

         // 4. Job Level match
         const matchesLevel = !selectedLevel ||
            job.tags.some(tag => tag.toLowerCase().includes(selectedLevel.toLowerCase())) ||
            (job.jobLevel && job.jobLevel.toLowerCase() === selectedLevel.toLowerCase());

         return matchesSearch && matchesLocation && matchesJobType && matchesLevel;
      })
      : rawJobsList; // Already filtered by server!

   useEffect(() => {
      setApplications(readStoredList(APPLICATIONS_STORAGE_KEY));
      setSavedJobs(readStoredList(SAVED_JOBS_STORAGE_KEY));
      setHasHydratedStorage(true);
   }, []);

   useEffect(() => {
      if (!hasHydratedStorage) return;
      localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
   }, [applications, hasHydratedStorage]);

   useEffect(() => {
      if (!hasHydratedStorage) return;
      localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(savedJobs));
      window.dispatchEvent(new Event(DATA_UPDATED_EVENT));
   }, [hasHydratedStorage, savedJobs]);

   useEffect(() => {
      const syncFromStorage = () => {
         const nextApplications = readStoredList<any>(APPLICATIONS_STORAGE_KEY);
         const nextSavedJobs = readStoredList<any>(SAVED_JOBS_STORAGE_KEY);
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

   const showToast = (message: string, kind: "success" | "error" = "success") => {
      setToast({ message, kind });
   };

   const addApplication = (job: any, e: React.MouseEvent) => {
      e.stopPropagation(); // Ngăn chặn chuyển trang khi click button
      if (!readAuthUser()) {
         showToast("Bạn cần đăng nhập trước khi ứng tuyển.", "error");
         return;
      }

      if (!hasCreatedCv()) {
         showToast("Bạn chưa có CV. Vui lòng tạo CV trước khi ứng tuyển.", "error");
         return;
      }

      if (applications.some((item) => item.company === job.company && item.title === job.title)) {
         showToast("Bạn đã ứng tuyển vị trí này rồi.", "error");
         return;
      }

      setApplyingJob(job);
   };

   const handleConfirmApply = async (cvId: number) => {
      if (!applyingJob) return;
      const jobToApply = applyingJob;
      setApplyingJob(null);

      let finalId = `${jobToApply.company}-${jobToApply.title}-${Date.now()}`;
      if (jobToApply.id) {
         try {
            const savedApp = await applicationsApi.create({ jobId: jobToApply.id, cvId });
            finalId = `api-${savedApp.id}`;
         } catch (err) {
            console.error("Backend apply failed:", err);
            showToast(
               err instanceof Error ? `Lỗi ứng tuyển: ${err.message}` : "Lỗi kết nối máy chủ khi ứng tuyển. Vui lòng thử lại sau.",
               "error",
            );
            return;
         }
      }

      setApplications((prev) => [
         {
            ...jobToApply,
            id: finalId,
            jobId: jobToApply.id,
            appliedAt: new Date().toLocaleString("vi-VN"),
            status: "Đang chờ xác nhận",
            trackingNote: "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
         },
         ...prev,
      ]);
      showToast(`Đã ứng tuyển thành công: ${jobToApply.title} tại ${jobToApply.company}.`);
   };

   const toggleSavedJob = async (job: any, e: React.MouseEvent) => {
      e.stopPropagation(); // Ngăn chặn chuyển trang
      const jobKey = job.id ? `job-${job.id}` : `${job.company}-${job.title}`;
      if (savingJobKey) return;
      setSavingJobKey(jobKey);

      const existingSavedJob = savedJobs.find((item) => savedJobMatches(item, job));
      try {
         if (existingSavedJob) {
            const serverSavedId = getSavedRecordId(existingSavedJob);
            if (readAuthUser() && serverSavedId) await savedJobsApi.remove(serverSavedId);
            setSavedJobs((current) => current.filter((item) => !savedJobMatches(item, job)));
            showToast(`Đã bỏ lưu công việc: ${job.title}.`);
            return;
         }

         let id = `${job.company}-${job.title}-${Date.now()}`;
         let serverId: number | undefined;
         if (job.id && readAuthUser()) {
            const savedJob = await savedJobsApi.create(job.id);
            serverId = savedJob.id;
            id = `api-saved-${savedJob.id}`;
         }

         const newSavedJob = { ...job, id, serverId, jobId: job.id, savedAt: new Date().toLocaleString("vi-VN") };
         setSavedJobs((current) => [newSavedJob, ...current.filter((item) => !savedJobMatches(item, job))]);
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

   const clearFilters = () => {
      setSearchTerm("");
      setSelectedLocation(null);
      setSelectedJobType(null);
      setSelectedLevel(null);
   };

   const hasFiltersActive = searchTerm || selectedLocation || selectedJobType || selectedLevel;

   return (
      <div className="space-y-10 pb-16">
         {/* Toast Notification */}
         {toast && (
            <div className={`fixed bottom-6 right-6 z-[2000] px-5 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-slide-up border transition-all ${toast.kind === "success"
               ? "bg-slate-900 border-slate-800 text-white"
               : "bg-rose-50 border-rose-100 text-rose-800"
               }`}>
               <CheckCircle2 className={`w-5 h-5 shrink-0 ${toast.kind === "success" ? "text-emerald-400" : "text-rose-500"}`} />
               <span className="text-[13.5px] font-bold">{toast.message}</span>
            </div>
         )}

         {/* ── Hero Banner Section ── */}
         <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
            {/* Decorative orbs */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative max-w-4xl mx-auto text-center space-y-6">
               <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-emerald-100">
                     <Briefcase className="w-8 h-8 text-emerald-600" />
                  </div>
               </div>
               <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                  Khám phá cơ hội nghề nghiệp bứt phá
               </h1>
               <p className="text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto">
                  Kết nối trực tiếp cùng các nhà tuyển dụng hàng đầu. Sử dụng bộ lọc thông minh tức thì và ứng tuyển siêu tốc chỉ với một cú click chuột.
               </p>

               {/* Search Bar */}
               <div className="pt-4 max-w-2xl mx-auto w-full">
                  <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-md focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                     <div className="flex-1 flex items-center gap-3 px-4">
                        <Search className="w-5 h-5 text-slate-400 shrink-0" />
                        <input
                           type="text"
                           placeholder="Nhập vị trí, công ty hoặc kỹ năng..."
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="bg-transparent border-none outline-none text-slate-900 text-[14.5px] w-full placeholder:text-slate-400 font-medium"
                        />
                        {searchTerm && (
                           <button onClick={() => setSearchTerm("")} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                              <X className="w-4 h-4" />
                           </button>
                        )}
                     </div>
                     <button className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[14px] rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0">
                        Tìm kiếm
                     </button>
                  </div>
               </div>
            </div>
         </section>

         {/* ── Main Layout: Filters sidebar + Jobs List grid ── */}
         <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-8 items-start">

            {/* 1. Left Sidebar: Interactive Filters */}
            <aside className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 lg:sticky lg:top-8 z-10">
               <div className="flex items-center justify-between">
                  <h2 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
                     <SlidersHorizontal className="w-4.5 h-4.5 text-slate-500" /> Bộ lọc thông minh
                  </h2>
                  {hasFiltersActive && (
                     <button
                        onClick={clearFilters}
                        className="text-[11.5px] font-extrabold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                     >
                        Xóa tất cả
                     </button>
                  )}
               </div>

               <hr className="border-slate-100" />

               {/* Filter Location */}
               <div className="space-y-3">
                  <h3 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">Địa điểm làm việc</h3>
                  <div className="flex flex-col gap-1.5">
                     {locationOptions.map(loc => {
                        const active = selectedLocation === loc;
                        return (
                           <button
                              key={loc}
                              type="button"
                              onClick={() => setSelectedLocation(active ? null : loc)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-300 cursor-pointer flex items-center justify-between border bg-white ${active
                                 ? "border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 text-slate-900"
                                 : "border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm"
                                 }`}
                           >
                              <span>{loc}</span>
                              {active && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />}
                           </button>
                        );
                     })}
                  </div>
               </div>

               <hr className="border-slate-100" />

               {/* Filter Job Type */}
               <div className="space-y-3">
                  <h3 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">Hình thức làm việc</h3>
                  <div className="flex flex-col gap-1.5">
                     {jobTypeOptions.map(({ value, label }) => {
                        const active = selectedJobType === value;
                        return (
                           <button
                              key={value}
                              type="button"
                              onClick={() => setSelectedJobType(active ? null : value)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-300 cursor-pointer flex items-center justify-between border bg-white ${active
                                 ? "border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 text-slate-900"
                                 : "border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm"
                                 }`}
                           >
                              <span>{label}</span>
                              {active && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />}
                           </button>
                        );
                     })}
                  </div>
               </div>

               <hr className="border-slate-100" />

               {/* Filter Level */}
               <div className="space-y-3">
                  <h3 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">Cấp bậc yêu cầu</h3>
                  <div className="flex flex-col gap-1.5">
                     {Object.entries(levelMap).map(([key, label]) => {
                        const active = selectedLevel === key;
                        return (
                           <button
                              key={key}
                              type="button"
                              onClick={() => setSelectedLevel(active ? null : key)}
                              className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-300 cursor-pointer flex items-center justify-between border bg-white ${active
                                 ? "border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 text-slate-900"
                                 : "border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm"
                                 }`}
                           >
                              <span>{label}</span>
                              {active && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />}
                           </button>
                        );
                     })}
                  </div>
               </div>
            </aside>

            {/* 2. Right: Jobs List Rendering */}
            <main className="space-y-6">
               <div className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-6 py-4 shadow-sm">
                  <p className="text-[13.5px] font-bold text-slate-500">
                     Đang hiển thị <span className="text-slate-900 font-extrabold">{filteredJobs.length}</span> vị trí phù hợp
                  </p>
                  {hasFiltersActive && (
                     <span className="text-[12px] font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-lg">
                        Bộ lọc đang hoạt động
                     </span>
                  )}
               </div>

               <div className="flex flex-col gap-4">
                  {filteredJobs.length === 0 ? (
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
                  ) : (
                     filteredJobs.map((job) => {
                        const jobSlug = job.slug ?? generateSlug(`${job.title} ${job.company}`);
                        const isSaved = savedJobs.some((item) => savedJobMatches(item, job));
                        const isSaving = savingJobKey === (job.id ? `job-${job.id}` : `${job.company}-${job.title}`);
                         const isApplied = applications.some((item) => item.company === job.company && item.title === job.title);

                        return (
                           <article
                              key={`${job.title}-${job.company}`}
                              onClick={() => router.push(`/tim-viec/${jobSlug}`)}
                              className="group relative bg-white border border-slate-100 rounded-[24px] p-5 sm:p-6 shadow-sm hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer flex flex-col sm:flex-row gap-5 items-start sm:items-center"
                              style={{ borderLeft: `5px solid ${job.companyColor}` }}
                           >
                              {/* Company Logo wrapper */}
                              <div
                                 className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center p-2.5 shrink-0 transition-all duration-300 group-hover:scale-105 overflow-hidden"
                              >
                                 <img 
                                    src={getLogoUrl(job.image)} 
                                    className="w-full h-full object-contain" 
                                    alt={job.company} 
                                    onError={handleLogoError}
                                 />
                              </div>

                              {/* Core Content */}
                              <div className="flex-1 min-w-0 space-y-2">
                                 <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-bold text-slate-500 hover:text-slate-900 transition-colors">{job.company}</span>
                                    {job.hot && (
                                       <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-600 text-[9.5px] font-extrabold uppercase">
                                          <Flame className="w-3 h-3 text-amber-500" /> Hot
                                       </span>
                                    )}
                                 </div>
                                 <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors truncate">
                                    {job.title}
                                 </h3>

                                 {/* Badges / Tags metadata */}
                                 <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                                       <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.place}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                                       <Wallet className="w-3.5 h-3.5 text-slate-400" /> {job.salary}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/50 text-[11.5px] font-bold">
                                       <Clock3 className="w-3.5 h-3.5 text-slate-400" /> {job.type}
                                    </span>

                                    {/* Tech Tag highlights */}
                                    {job.tags.slice(0, 3).map((tag, tIdx) => (
                                       <span key={tIdx} className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50/50 text-emerald-700 border border-emerald-100/60 text-[11px] font-extrabold uppercase">
                                          {tag}
                                       </span>
                                    ))}
                                 </div>
                              </div>

                              {/* Call to Actions (CTA) */}
                              <div className="w-full sm:w-auto shrink-0 flex sm:flex-col gap-2.5 items-center sm:items-end justify-between border-t border-slate-50 sm:border-t-0 pt-4 sm:pt-0">
                                 <span className="text-[11.5px] font-bold text-slate-400">{job.posted}</span>
                                 <div className="flex items-center gap-2">
                                    <button
                                       type="button"
                                       onClick={(e) => toggleSavedJob(job, e)}
                                       disabled={isSaving}
                                       aria-pressed={isSaved}
                                       aria-label={isSaved ? `Bỏ lưu ${job.title}` : `Lưu ${job.title}`}
                                       className={`p-3 rounded-xl border transition-all active:scale-95 cursor-pointer disabled:cursor-wait disabled:opacity-60 ${isSaved
                                          ? "bg-rose-50 border-rose-100 text-rose-500 shadow-sm"
                                          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
                                          }`}
                                       title={isSaved ? "Bỏ lưu tin" : "Lưu tin tuyển dụng"}
                                    >
                                       <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
                                    </button>
                                    {isApplied ? (
                                       <button
                                          disabled
                                          onClick={(e) => e.stopPropagation()}
                                          className="px-5 py-3 bg-slate-100 text-slate-500 font-extrabold text-[13.5px] rounded-xl border border-slate-200 cursor-default inline-flex items-center gap-1.5"
                                       >
                                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Đã ứng tuyển
                                       </button>
                                    ) : (
                                       <button
                                          onClick={(e) => addApplication(job, e)}
                                          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[13.5px] rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                                       >
                                          Ứng tuyển
                                       </button>
                                    )}
                                 </div>
                              </div>
                           </article>
                        );
                     })
                  )}
                  {!loadingMore && hasMore && apiJobs.length > 0 && (
                     <div className="text-center py-6">
                        <button
                           onClick={loadMoreJobs}
                           className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-[14px] rounded-xl hover:shadow-lg active:scale-95 transition-all cursor-pointer shadow-md"
                        >
                           Xem thêm công việc
                        </button>
                     </div>
                  )}
                  {loadingMore && (
                     <div className="text-center py-4 text-slate-500 font-extrabold text-sm animate-pulse">
                        Đang tải thêm công việc...
                     </div>
                  )}
                  {!hasMore && apiJobs.length > 0 && (
                     <div className="text-center py-4 text-slate-400 font-extrabold text-xs uppercase tracking-wider">
                        Đã tải hết tất cả công việc
                     </div>
                  )}
               </div>
            </main>
         </div>

         {/* ── Hiring Promotions Grid (Tailwind Styled) ── */}
         <section className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-inner space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
               <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                  <Award className="w-6 h-6 text-emerald-500" /> Quảng cáo tuyển dụng nổi bật
               </h2>
               <span className="text-[12.5px] text-slate-400 font-extrabold uppercase tracking-wider">Đối tác tin cậy của JobPilot</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {hiringPromotions.map((promo) => (
                  <article key={promo.title} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:border-emerald-500/20 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group">
                     <div className="space-y-3">
                        <span className={`text-[9.5px] font-extrabold px-2.5 py-1 rounded bg-slate-50 border border-slate-200/50 tracking-wider uppercase ${promo.textAccent}`}>
                           SPONSORED
                        </span>
                        <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-emerald-600 transition-colors pt-2">{promo.title}</h3>
                        <p className="text-[13px] text-slate-700 font-extrabold">{promo.subtitle}</p>
                        <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{promo.description}</p>
                     </div>
                     <button
                        onClick={() => {
                           if (promo.title.toLowerCase().includes("it")) {
                              setSearchTerm("React");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                              showToast("Đã lọc các vị trí IT / React Developer nổi bật!");
                           } else if (promo.title.toLowerCase().includes("hybrid")) {
                              setSelectedJobType("Hybrid");
                              window.scrollTo({ top: 0, behavior: "smooth" });
                              showToast("Đã lọc các công việc có chính sách Hybrid!");
                           } else if (promo.title.toLowerCase().includes("mega")) {
                              showToast("Đăng ký Mega Career Fair thành công! Vé tham dự đã được gửi vào email của bạn.");
                           }
                        }}
                        className={`mt-6 w-full py-3 bg-gradient-to-r ${promo.accent} text-white font-extrabold text-[13px] rounded-xl hover:opacity-90 shadow-md active:scale-95 cursor-pointer transition-all`}
                     >
                        {promo.cta}
                     </button>
                  </article>
               ))}
            </div>
         </section>

         {/* ── Related Job Articles Grid ── */}
         <section className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
               <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                  <CalendarClock className="w-6 h-6 text-slate-500" /> Bài viết cẩm nang sự nghiệp
               </h2>
               <Link href="/cam-nang" className="text-[13px] font-extrabold text-sky-600 hover:text-sky-700 hover:underline">Xem tất cả bài viết ↗</Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {jobArticles.map((article) => (
                  <article key={article.title} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col group">
                     <div className="h-44 w-full bg-slate-100 overflow-hidden relative">
                         <img src={typeof article.image === 'string' ? article.image : (article.image as any)?.src} alt={article.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute top-4 left-4 text-[10.5px] font-extrabold bg-sky-50 border border-sky-100 text-sky-600 px-3 py-1 rounded-xl shadow-md uppercase tracking-wider">
                           {article.category}
                        </span>
                     </div>
                     <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                           <span className="text-[11px] text-slate-400 font-bold">{article.readTime}</span>
                           <h3 className="text-[15.5px] font-black text-slate-900 leading-snug group-hover:text-sky-600 transition-colors">{article.title}</h3>
                           <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{article.summary}</p>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         </section>

         <ApplyCvModal
            isOpen={applyingJob !== null}
            onClose={() => setApplyingJob(null)}
            onConfirm={handleConfirmApply}
         />

      </div>
   );
}
