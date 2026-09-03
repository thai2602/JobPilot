
'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import {
   ArrowUpRight,
   Bookmark,
   Briefcase,
   Building2,
   ChevronRight,
   CheckCircle2,
   MapPin,
   Search,
   ShieldCheck,
   SlidersHorizontal,
   Sparkles,
   Star,
   Users,
   Wallet,
   X,
} from "lucide-react";
import { applicationsApi } from "../../services/applicationsApi";
import { companiesApi } from "../../services/companiesApi";
import { savedJobsApi } from "../../services/savedJobsApi";
import { readAuthUser } from "../../utils/auth";
import { getActiveCvId, hasCreatedCv } from "../../utils/cv";
import { toVietnameseJobTitle } from "../../utils/jobTitle";
import { formatSalaryRange } from "../../utils/salary";
import { cleanApiText, splitApiText } from "../../utils/content";
import styles from "./CompaniesPage.module.css";
import { companyAvatars, companyImages } from "./companyAssets";
import { mockCompanies as companies, CompanyItem } from "./mockCompanies";

const fieldColors: Record<string, { bg: string; text: string }> = {
   "Technology": { bg: "#eef2ff", text: "#4f46e5" },
   "Ecommerce": { bg: "#ecfdf5", text: "#059669" },
   "Healthcare": { bg: "#f0f9ff", text: "#0284c7" },
   "Finance": { bg: "#fffbeb", text: "#b45309" },
   "Design": { bg: "#fce7f3", text: "#be185d" },
   "Education": { bg: "#ecfeff", text: "#0891b2" },
   "Gaming": { bg: "#fef2f2", text: "#dc2626" },
   "Logistics": { bg: "#ecfdf5", text: "#059669" },
   "Manufacturing": { bg: "#f3e8ff", text: "#7c3aed" },
   "Consulting": { bg: "#ecfeff", text: "#0891b2" },
   "Real Estate": { bg: "#fff7ed", text: "#c2410c" },
   "Automotive": { bg: "#fef2f2", text: "#dc2626" },
   "Food & Beverage": { bg: "#f0fdf4", text: "#16a34a" },
   "Travel": { bg: "#f0fdfa", text: "#0d9488" },
   "Energy": { bg: "#fefce8", text: "#a16207" },
   "Fashion": { bg: "#fdf2f8", text: "#db2777" },
   "Agriculture": { bg: "#f7fee7", text: "#65a30d" },
};

const fieldLabels: Record<string, string> = {
   Technology: "Công nghệ",
   Ecommerce: "Thương mại điện tử",
   Healthcare: "Y tế",
   Finance: "Tài chính",
   Design: "Thiết kế",
   Education: "Giáo dục",
   Gaming: "Trò chơi",
   Logistics: "Logistics",
   Manufacturing: "Sản xuất",
   Consulting: "Tư vấn",
   "Real Estate": "Bất động sản",
   Automotive: "Ô tô",
   "Food & Beverage": "Ẩm thực",
   Travel: "Du lịch",
   Energy: "Năng lượng",
   Fashion: "Thời trang",
   Agriculture: "Nông nghiệp",
};

export default function CompaniesPage() {
   const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
   const [selectedPosition, setSelectedPosition] = useState<any>(null);
   const [bannerIndex, setBannerIndex] = useState(0);
   const [bannerPaused, setBannerPaused] = useState(false);
    const [applications, setApplications] = useState<any[]>(() => {
       if (typeof window === "undefined") return [];
       const saved = localStorage.getItem("jobpilot_applications");
       try {
          return saved ? JSON.parse(saved) || [] : [];
       } catch {
          return [];
       }
    });
    const [savedJobs, setSavedJobs] = useState<any[]>(() => {
       if (typeof window === "undefined") return [];
       const saved = localStorage.getItem("jobpilot_saved_jobs");
       try {
          return saved ? JSON.parse(saved) || [] : [];
       } catch {
          return [];
       }
    });

    // --- API companies state & Pagination ---
    const [apiCompanies, setApiCompanies] = useState<CompanyItem[]>([]);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(true);
    const [hasMore, setHasMore] = useState(true);
    const [isUsingFallback, setIsUsingFallback] = useState(false);

    const mapApiCompanies = (apiData: any[]): CompanyItem[] => {
       return apiData.map((apiItem, idx) => {
          const normalizeName = (name: string) =>
             name
                .trim()
                .normalize("NFD")
                .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-+|-+$/g, "");
          const staticMatch = companies.find(
             (c) => normalizeName(c.name) === normalizeName(apiItem.name)
          );

          const benefitsArr = splitApiText(apiItem.benefits, 4);
          const activeApiPositions = (apiItem.positions ?? []).filter((position: any) => {
             if (position.status && position.status !== "PUBLISHED") return false;
             if (position.isDeleted) return false;
             if (!position.expiredAt) return true;
             const expiredAt = new Date(position.expiredAt);
             return Number.isNaN(expiredAt.getTime()) || expiredAt.getTime() > Date.now();
          });
          const mappedPositions = activeApiPositions.map((position: any) => ({
             id: position.id,
             title: position.title,
             salary: formatSalaryRange(position.salaryMin, position.salaryMax),
             workingHours: position.jobType || "Toàn thời gian",
             description: cleanApiText(position.description) || "Mô tả công việc đang được cập nhật.",
             skills: [position.jobLevel || "Nhân viên", `Kinh nghiệm ${position.experienceYears || "1 năm"}`],
          }));
          const jobLocation = activeApiPositions
             ?.map((position: any) => position.locationCity)
             .find((location: unknown) => typeof location === "string" && location.trim());
          const apiLocation = cleanApiText(apiItem.headquarters) || jobLocation;
          const apiIndustry = cleanApiText(apiItem.industry)
             || cleanApiText(activeApiPositions.find((position: any) => position.industry)?.industry)
             || "Chưa được cung cấp";
          const positionBenefits: string[] = activeApiPositions.flatMap(
             (position: any): string[] => splitApiText(position.benefits, 2),
          );
          const visibleBenefits: string[] = benefitsArr.length
             ? benefitsArr
             : positionBenefits.length
                ? Array.from(new Set<string>(positionBenefits)).slice(0, 4)
                : ["Doanh nghiệp chưa cung cấp thông tin phúc lợi"];
          const apiDescription = cleanApiText(apiItem.description);
          const recruitmentSummary = mappedPositions.length
             ? `${mappedPositions.length} vị trí đang tuyển tại ${apiLocation || "địa điểm được nêu trong tin tuyển dụng"}.`
             : "Doanh nghiệp hiện chưa có vị trí tuyển dụng đang mở.";

          if (staticMatch) {
             return {
                ...staticMatch,
                name: apiItem.name,
                slug: apiItem.slug || staticMatch.slug,
                field: apiIndustry,
                rating: "",
                description: apiDescription || recruitmentSummary,
                employees: apiItem.size || "Đang cập nhật",
                location: apiLocation || "Đang cập nhật",
                benefits: visibleBenefits,
                positions: mappedPositions,
                openJobs: mappedPositions.length,
             };
          }

          return {
             name: apiItem.name,
             slug: apiItem.slug,
             field: apiIndustry,
             rating: "",
             employees: apiItem.size ?? "Đang cập nhật",
             location: apiLocation || "Đang cập nhật",
             openJobs: mappedPositions.length,
             color: apiItem.color || "#059669",
             bg: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
             initial: apiItem.name.charAt(0).toUpperCase(),
             description: apiDescription || recruitmentSummary,
             benefits: visibleBenefits,
             positions: mappedPositions,
             image: companyAvatars[idx % companyAvatars.length],
             companyImage: companyImages[idx % companyImages.length],
          } as CompanyItem;
       });
    };

    // Fetch công ty từ API (lần đầu 6)
    useEffect(() => {
       setLoadingMore(true);
       companiesApi.list({ offset: 0, limit: 6, completeOnly: true })
          .then((apiData) => {
             if (!apiData || apiData.length === 0) {
                setApiCompanies(companies.slice(0, 6));
                setHasMore(companies.length > 6);
                setOffset(6);
                setIsUsingFallback(true);
                return;
             }
             const mapped = mapApiCompanies(apiData);
             setApiCompanies(mapped);
             setHasMore(apiData.length === 6);
             setOffset(6);
             setIsUsingFallback(false);
          })
          .catch((err) => {
             console.error("Lỗi tải API công ty, chuyển sang dữ liệu dự phòng:", err);
             setApiCompanies(companies.slice(0, 6));
             setHasMore(companies.length > 6);
             setOffset(6);
             setIsUsingFallback(true);
          })
          .finally(() => {
             setLoadingMore(false);
          });
    }, []);

    // Load thêm 6 công ty khi cuộn
    const loadMoreCompanies = () => {
       if (loadingMore || !hasMore) return;
       setLoadingMore(true);

       if (isUsingFallback) {
          setTimeout(() => {
             const fallbackCompanies = activeSearch
                ? companies.filter((company) => normalizeName([
                   company.name,
                   company.field,
                   company.location,
                   company.description,
                ].join(" ")).includes(normalizeName(activeSearch)))
                : companies;
             const nextBatch = fallbackCompanies.slice(offset, offset + 6);
             if (nextBatch.length > 0) {
                setApiCompanies((prev) => [...prev, ...nextBatch]);
                setOffset((prev) => prev + 6);
                setHasMore(fallbackCompanies.length > offset + 6);
             } else {
                setHasMore(false);
             }
             setLoadingMore(false);
          }, 400);
          return;
       }

       companiesApi.list({ offset, limit: 6, search: activeSearch || undefined, completeOnly: true })
          .then((apiData) => {
             if (!apiData || apiData.length === 0) {
                setHasMore(false);
                return;
             }
             const mapped = mapApiCompanies(apiData);
             setApiCompanies((prev) => [...prev, ...mapped]);
             setOffset((prev) => prev + 6);
             setHasMore(apiData.length === 6);
          })
          .catch((err) => {
             console.error("Lỗi tải thêm công ty từ API, chuyển sang dữ liệu dự phòng:", err);
             const fallbackCompanies = activeSearch
                ? companies.filter((company) => normalizeName([
                   company.name,
                   company.field,
                   company.location,
                   company.description,
                ].join(" ")).includes(normalizeName(activeSearch)))
                : companies;
             const nextBatch = fallbackCompanies.slice(offset, offset + 6);
             if (nextBatch.length > 0) {
                setApiCompanies((prev) => [...prev, ...nextBatch]);
                setOffset((prev) => prev + 6);
                setHasMore(fallbackCompanies.length > offset + 6);
             } else {
                setHasMore(false);
             }
          })
          .finally(() => {
             setLoadingMore(false);
          });
    };

   const [selectedFilter, setSelectedFilter] = useState<string>("Tất cả");
   const [searchTerm, setSearchTerm] = useState("");
   const [activeSearch, setActiveSearch] = useState("");
   const [sortMode, setSortMode] = useState<"featured" | "rating" | "jobs" | "name">("featured");
   const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);


   const normalizeName = (name: string) =>
      name
         .trim()
         .normalize("NFD")
         .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
         .replace(/[\u0300-\u036f]/g, "")
         .toLowerCase()
         .replace(/[^a-z0-9]+/g, "-")
         .replace(/^-+|-+$/g, "");
   const searchCompanies = (rawQuery = searchTerm) => {
      const query = rawQuery.trim();
      setLoadingMore(true);
      setSelectedFilter("Tất cả");
      setActiveSearch(query);

      companiesApi.list({ offset: 0, limit: 6, search: query || undefined, completeOnly: true })
         .then((apiData) => {
            const mapped = mapApiCompanies(apiData || []);
            setApiCompanies(mapped);
            setOffset(mapped.length);
            setHasMore((apiData || []).length === 6);
            setIsUsingFallback(false);
         })
         .catch((error) => {
            console.error("Lỗi tìm kiếm công ty từ API, dùng dữ liệu dự phòng:", error);
            const normalizedQuery = normalizeName(query);
            const fallbackCompanies = query
               ? companies.filter((company) => normalizeName([
                  company.name,
                  company.field,
                  company.location,
                  company.description,
               ].join(" ")).includes(normalizedQuery))
               : companies;
            const firstBatch = fallbackCompanies.slice(0, 6);
            setApiCompanies(firstBatch);
            setOffset(firstBatch.length);
            setHasMore(fallbackCompanies.length > firstBatch.length);
            setIsUsingFallback(true);
         })
         .finally(() => {
            setLoadingMore(false);
            document.getElementById("company-directory")?.scrollIntoView({ behavior: "smooth", block: "start" });
         });
   };
   const getDefaultContact = (companyName: string) => ({
      email: `contact@${normalizeName(companyName)}.com`,
      phone: "(+84) 28 1234 5678",
      website: `www.${normalizeName(companyName)}.com`,
   });
   const getDefaultTerms = () => [
      "Chính sách bảo mật thông tin",
      "Môi trường làm việc chuyên nghiệp",
      "Chế độ đãi ngộ cạnh tranh",
   ];
   const findStaticCompany = (name: string) => companies.find((c) => normalizeName(c.name) === normalizeName(name));
   const getCompanyIntroduction = (company: CompanyItem) => {
      const introText = company.introduction?.trim() || company.description;
      const benefitText = company.benefits?.length ? `Phúc lợi nổi bật gồm: ${company.benefits.join(", ")}.` : "";
      const positionText = company.positions?.length ? `Hiện tại ${company.name} đang mở ${company.positions.length} vị trí trong lĩnh vực ${company.field}, phù hợp với ứng viên muốn phát triển sự nghiệp chuyên sâu.` : "";
      return [
         introText,
         `${company.name} có trụ sở tại ${company.location} và đội ngũ ${company.employees}.`,
         benefitText,
         positionText,
      ].filter(Boolean);
   };
   const getMergedCompany = (item: CompanyItem) => {
      const staticCompany = findStaticCompany(item.name);
      const contact = item.contact || staticCompany?.contact || getDefaultContact(item.name);
      const terms = item.terms?.length ? item.terms : staticCompany?.terms?.length ? staticCompany.terms : getDefaultTerms();
      if (!staticCompany) {
         return {
            ...item,
            contact,
            terms,
         };
      }

      return {
         ...staticCompany,
         slug: item.slug,                  // Giữ slug gốc từ API (ưu tiên hơn slug static)
         description: item.description || staticCompany.description,
         benefits: item.benefits?.length ? item.benefits : staticCompany.benefits,
         employees: item.employees || staticCompany.employees,
         location: item.location || staticCompany.location,
         rating: item.rating ?? staticCompany.rating,
         field: item.field || staticCompany.field,
         color: item.color || staticCompany.color,
         bg: item.bg || staticCompany.bg,
         positions: Array.isArray(item.positions) ? item.positions : staticCompany.positions || [],
         contact,
         terms,
      };
   };

   // Danh sách hiển thị lấy dữ liệu API làm nguồn chính; dữ liệu mẫu chỉ là phương án dự phòng khi API lỗi.
   const displayedCompanies = apiCompanies.map(getMergedCompany);
   const spotlightCompanies = displayedCompanies.slice(0, 3);

   useEffect(() => {
      if (
         bannerPaused ||
         spotlightCompanies.length <= 1 ||
         window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
         return;
      }
      const interval = setInterval(() => {
         setBannerIndex((current) => (current + 1) % spotlightCompanies.length);
      }, 5000);
      return () => clearInterval(interval);
   }, [bannerPaused, spotlightCompanies.length]);

   useEffect(() => {
      setBannerIndex((current) => (
         spotlightCompanies.length ? current % spotlightCompanies.length : 0
      ));
   }, [spotlightCompanies.length]);



   useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const companyName = params.get("company")?.trim();
      if (!companyName) {
         return;
      }

      const jobTitle = params.get("jobTitle")?.trim();
      const field = params.get("field")?.trim() || "Technology";
      const place = params.get("place")?.trim() || "Chưa cập nhật";
      const salary = params.get("salary")?.trim() || "Thỏa thuận";
      const companyDescription = params.get("companyDescription")?.trim() || "Thông tin doanh nghiệp đang được cập nhật.";
      const jobDescription = params.get("jobDescription")?.trim() || "Mô tả công việc đang được cập nhật.";
      const companyColor = params.get("companyColor")?.trim() || "#0ea5e9";

      const matchedCompany = companies.find((item) => item.name.toLowerCase() === companyName.toLowerCase());
      if (matchedCompany) {
         setSelectedFilter(matchedCompany.field);
         setSelectedCompany(matchedCompany);
         return;
      }

      const fallbackCompany: CompanyItem = {
         name: companyName,
         field,
         rating: "4.5",
         employees: "Đang cập nhật",
         location: place,
         openJobs: 1,
         color: companyColor,
         bg: `linear-gradient(135deg, ${companyColor}22, ${companyColor}10)`,
         initial: companyName.slice(0, 1).toUpperCase(),
         description: companyDescription,
         benefits: ["Môi trường chuyên nghiệp", "Lộ trình phát triển", "Phúc lợi cạnh tranh"],
         contact: getDefaultContact(companyName),
         terms: ["Chính sách bảo mật thông tin", "Môi trường làm việc chuyên nghiệp", "Chế độ đãi ngộ cạnh tranh"],
         image: companyAvatars[0],
         positions: [
            {
               title: jobTitle || "Vị trí đang tuyển",
               salary,
               workingHours: "Toàn thời gian",
               description: jobDescription,
               skills: [field, "Trao đổi khi phỏng vấn", "Kinh nghiệm liên quan"],
            },
         ],
      };

      setSelectedFilter(field);
      setSelectedCompany(fallbackCompany);
   }, []);

   useEffect(() => {
      localStorage.setItem("jobpilot_applications", JSON.stringify(applications));
      window.dispatchEvent(new Event("jobpilot-data-updated"));
   }, [applications]);

   useEffect(() => {
      localStorage.setItem("jobpilot_saved_jobs", JSON.stringify(savedJobs));
      window.dispatchEvent(new Event("jobpilot-data-updated"));
   }, [savedJobs]);

   useEffect(() => {
      if (!toast) {
         return;
      }

      const timeoutId = window.setTimeout(() => setToast(null), 2600);
      return () => window.clearTimeout(timeoutId);
   }, [toast]);

   useEffect(() => {
      if (!selectedCompany) {
         return;
      }

      const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const previousOverflow = document.body.style.overflow;
      const closeButton = document.getElementById("company-dialog-close");
      const handleKeyDown = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setSelectedCompany(null);
         }
      };

      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      window.requestAnimationFrame(() => closeButton?.focus());

      return () => {
         document.body.style.overflow = previousOverflow;
         window.removeEventListener("keydown", handleKeyDown);
         previousFocus?.focus();
      };
   }, [selectedCompany]);

   const showToast = (message: string, kind: "success" | "error" = "success") => {
      setToast({ message, kind });
   };

   const uniqueFields = Array.from(new Set(displayedCompanies.map(c => c.field)));
   const filters = ["Tất cả", ...uniqueFields];
   const normalizedSearch = normalizeName(activeSearch);
   const filteredCompanies = displayedCompanies.filter((company) => {
      const matchesField = selectedFilter === "Tất cả" || company.field === selectedFilter;
      if (!matchesField || !normalizedSearch) {
         return matchesField;
      }
      const searchableText = normalizeName([
         company.name,
         company.field,
         fieldLabels[company.field] || "",
         company.location,
         company.description,
         ...(company.benefits || []),
      ].join(" "));
      return searchableText.includes(normalizedSearch);
   });
   const sortedCompanies = [...filteredCompanies].sort((left, right) => {
      if (sortMode === "rating") return Number(right.rating) - Number(left.rating);
      if (sortMode === "jobs") return (right.positions.length || right.openJobs) - (left.positions.length || left.openJobs);
      if (sortMode === "name") return left.name.localeCompare(right.name, "vi");
      return 0;
   });
   const totalOpenJobs = displayedCompanies.reduce((total, company) => total + (company.positions.length || company.openJobs), 0);
   const isInitialLoading = loadingMore && apiCompanies.length === 0;
   const resetDirectoryFilters = () => {
      setSearchTerm("");
      searchCompanies("");
      setSelectedFilter("Tất cả");
      setSortMode("featured");
   };

   const addApplication = async (job: any) => {
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

      if (job.id) {
         const cvId = getActiveCvId();
         if (!cvId) {
            showToast("Không tìm thấy CV đã chọn. Vui lòng mở lại trang CV của tôi.", "error");
            return;
         }
         try {
            const savedApplication = await applicationsApi.create({ jobId: job.id, cvId });
            job = { ...job, jobId: job.id, id: `api-${savedApplication.id}`, cvId };
         } catch (e) {
            console.error("Could not save application to server", e);
            showToast(e instanceof Error ? e.message : "Không thể ứng tuyển lúc này.", "error");
            return;
         }
      }

      const id = typeof job.id === "string" && job.id.startsWith("api-")
         ? job.id
         : `${job.company}-${job.title}-${Date.now()}`;
      setApplications([
         {
            ...job,
            id,
            appliedAt: new Date().toLocaleString("vi-VN"),
            status: "Đang chờ xác nhận",
            trackingNote: "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
         },
         ...applications,
      ]);
      showToast(`Đã ứng tuyển thành công: ${job.title} tại ${job.company}.`);
   };

   const addSavedJob = async (job: any) => {
      if (savedJobs.some((item) => item.company === job.company && item.title === job.title)) {
         showToast("Công việc này đã có trong mục đã lưu.", "error");
         return;
      }

      if (job.id && readAuthUser()) {
         try {
            const savedJob = await savedJobsApi.create(job.id);
            job = { ...job, jobId: job.id, id: `api-saved-${savedJob.id}` };
         } catch (e) {
            console.error("Could not save job to server", e);
            showToast(e instanceof Error ? e.message : "Không thể lưu công việc lúc này.", "error");
            return;
         }
      }

      const id = typeof job.id === "string" && job.id.startsWith("api-saved-")
         ? job.id
         : `${job.company}-${job.title}-${Date.now()}`;
      setSavedJobs([{ ...job, id, savedAt: new Date().toLocaleString("vi-VN") }, ...savedJobs]);
      showToast(`Đã lưu công việc: ${job.title} tại ${job.company}.`);
   };

   const getCompanyLogo = (company: CompanyItem): string => {
      const logo = company.image;
      if (logo) return typeof logo === 'string' ? logo : (logo as any)?.src || "";
      const index = companies.findIndex((c) => c.name === company.name);
      const res = index >= 0 ? companyAvatars[index % companyAvatars.length] : companyAvatars[Array.from(company.name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % companyAvatars.length];
      return typeof res === 'string' ? res : (res as any)?.src || "";
   };

   const getCompanyImage = (company: CompanyItem): string => {
      const img = company.companyImage || company.image;
      if (img) return typeof img === 'string' ? img : (img as any)?.src || "";
      const index = companies.findIndex((c) => c.name === company.name);
      const res = index >= 0 ? companyImages[index % companyImages.length] : companyImages[Array.from(company.name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % companyImages.length];
      return typeof res === 'string' ? res : (res as any)?.src || "";
   };

   const selectedCompanyLogo: string = selectedCompany ? getCompanyLogo(selectedCompany) : (companyAvatars[0] as any)?.src || "";
   const selectedCompanyImage: string = selectedCompany ? getCompanyImage(selectedCompany) : (companyImages[0] as any)?.src || "";
   const selectedPositionCompany = selectedPosition
      ? displayedCompanies.find((company) => company.name === selectedPosition.company) ?? selectedCompany
      : null;
   const selectedPositionLogo = selectedPositionCompany
      ? getCompanyLogo(selectedPositionCompany)
      : (companyAvatars[0] as any)?.src || "";
   const spotlightCompany = spotlightCompanies.length
      ? spotlightCompanies[bannerIndex % spotlightCompanies.length]
      : null;
   const spotlightDescription = spotlightCompany
      ? (spotlightCompany.description.length > 170
         ? `${spotlightCompany.description.slice(0, 167).trimEnd()}...`
         : spotlightCompany.description)
      : "Đang tải dữ liệu doanh nghiệp từ hệ thống...";

   return (
      <div className={styles.page}>
         <section className={styles.hero} aria-labelledby="companies-hero-title">
            <div className={styles.heroGlowOne} />
            <div className={styles.heroGlowTwo} />
            <div className={styles.heroGrid}>
               <div className={styles.heroCopy}>
                  <span className={styles.heroEyebrow}>
                     <Sparkles aria-hidden="true" />
                     Mạng lưới nhà tuyển dụng JobPilot
                  </span>
                  <h1 id="companies-hero-title" className={styles.heroTitle}>
                     Tìm nơi bạn có thể <span>phát triển lâu dài.</span>
                  </h1>
                  <p className={styles.heroDescription}>
                     Khám phá văn hóa, môi trường làm việc và những vị trí đang tuyển từ các doanh nghiệp phù hợp với định hướng của bạn.
                  </p>

                  <form
                     className={styles.heroSearch}
                     role="search"
                     onSubmit={(event) => {
                        event.preventDefault();
                        searchCompanies();
                     }}
                  >
                     <Search aria-hidden="true" className={styles.searchIcon} />
                     <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Tên công ty, lĩnh vực hoặc địa điểm..."
                        aria-label="Tìm kiếm công ty"
                     />
                     {searchTerm && (
                        <button
                           type="button"
                           className={styles.clearSearch}
                           onClick={() => {
                              setSearchTerm("");
                              searchCompanies("");
                           }}
                           aria-label="Xóa nội dung tìm kiếm"
                        >
                           <X aria-hidden="true" />
                        </button>
                     )}
                     <button type="submit" className={styles.searchSubmit}>
                        Tìm công ty
                        <ChevronRight aria-hidden="true" />
                     </button>
                  </form>

                  <div className={styles.heroStats} aria-label="Thống kê danh bạ công ty">
                     <div>
                        <strong>{displayedCompanies.length || "—"}</strong>
                        <span>doanh nghiệp đã tải</span>
                     </div>
                     <div>
                        <strong>{totalOpenJobs || "—"}</strong>
                        <span>vị trí đang mở</span>
                     </div>
                     <div>
                        <strong>{uniqueFields.length || "—"}</strong>
                        <span>lĩnh vực nổi bật</span>
                     </div>
                  </div>
               </div>

               <article className={styles.spotlightCard} aria-label="Doanh nghiệp nổi bật">
                  {spotlightCompany && <img src={getCompanyImage(spotlightCompany)} alt="" />}
                  <div className={styles.spotlightOverlay} />
                  <div className={styles.spotlightContent}>
                     <span className={styles.spotlightLabel}>
                        <ShieldCheck aria-hidden="true" /> Nhà tuyển dụng nổi bật
                     </span>
                     <h2>{spotlightCompany?.name || "Đang tải doanh nghiệp"}</h2>
                     <p>{spotlightDescription}</p>
                     <div className={styles.bannerControls}>
                        <div className={styles.bannerDots} aria-label="Chọn doanh nghiệp nổi bật">
                           {spotlightCompanies.map((item, index) => (
                              <button
                                 key={item.slug || item.name}
                                 type="button"
                                 onClick={() => setBannerIndex(index)}
                                 className={index === bannerIndex ? styles.bannerDotActive : styles.bannerDot}
                                 aria-label={`Xem doanh nghiệp nổi bật ${index + 1}`}
                                 aria-current={index === bannerIndex ? "true" : undefined}
                              />
                           ))}
                        </div>
                        <button
                           type="button"
                           className={styles.carouselToggle}
                           onClick={() => setBannerPaused((current) => !current)}
                           aria-label={bannerPaused ? "Tiếp tục trình chiếu" : "Tạm dừng trình chiếu"}
                        >
                           <span aria-hidden="true">{bannerPaused ? "▶" : "Ⅱ"}</span>
                        </button>
                     </div>
                  </div>
               </article>
            </div>
         </section>

         {selectedPosition && (
            <section className={styles.selectedJob} aria-label="Vị trí đang xem">
               <img src={selectedPositionLogo} alt={`${selectedPosition.company} logo`} />
               <div>
                  <span>Vị trí bạn vừa xem</span>
                  <h2>{toVietnameseJobTitle(selectedPosition.title)}</h2>
                  <p>{selectedPosition.company} · {selectedPosition.place || selectedCompany?.location}</p>
               </div>
               <button type="button" onClick={() => setSelectedPosition(null)} aria-label="Đóng vị trí đang xem">
                  <X aria-hidden="true" />
               </button>
            </section>
         )}

         <section id="company-directory" className={styles.directory} aria-labelledby="company-directory-title">
            <header className={styles.directoryHeader}>
               <div>
                  <span className={styles.sectionEyebrow}>Danh bạ doanh nghiệp</span>
                  <h2 id="company-directory-title">Khám phá công ty phù hợp</h2>
                  <p role="status" aria-live="polite">
                     {isInitialLoading
                        ? "Đang chuẩn bị danh sách doanh nghiệp..."
                        : `${sortedCompanies.length} doanh nghiệp phù hợp với lựa chọn hiện tại.`}
                  </p>
               </div>
               <label className={styles.sortControl}>
                  <SlidersHorizontal aria-hidden="true" />
                  <span>Sắp xếp</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as typeof sortMode)}>
                     <option value="featured">Nổi bật</option>
                     <option value="rating">Đánh giá cao</option>
                     <option value="jobs">Nhiều vị trí nhất</option>
                     <option value="name">Tên A–Z</option>
                  </select>
               </label>
            </header>

            <div className={styles.filterBar} role="group" aria-label="Lọc công ty theo lĩnh vực">
               {filters.map((filter) => (
                  <button
                     key={filter}
                     type="button"
                     onClick={() => setSelectedFilter(filter)}
                     className={filter === selectedFilter ? styles.industryFilterActive : styles.industryFilter}
                     aria-pressed={filter === selectedFilter}
                  >
                     {fieldLabels[filter] ?? filter}
                  </button>
               ))}
            </div>

            <div className={styles.companyGrid}>
               {isInitialLoading && [0, 1, 2, 3].map((item) => (
                  <div key={item} className={styles.skeletonCard} aria-hidden="true">
                     <div className={styles.skeletonImage} />
                     <div className={styles.skeletonBody}>
                        <span />
                        <span />
                        <span />
                     </div>
                  </div>
               ))}

               {!isInitialLoading && sortedCompanies.map((item, index) => {
                  const fieldTone = fieldColors[item.field] ?? { bg: "#f1f5f9", text: "#475569" };
                  const avatarSrc = getCompanyLogo(item);
                  const companyImageSrc = getCompanyImage(item);
                  const companySlug = item.slug ?? normalizeName(item.name);
                  const openingCount = item.positions.length || item.openJobs || 0;
                  const detailDescription = item.introduction || item.description;
                  const hasRating = Number(item.rating) > 0;
                  const isHighlyRated = hasRating && Number(item.rating) >= 4.7;

                  return (
                     <Link
                        key={`${item.name}-${companySlug}`}
                        href={`/cong-ty/${companySlug}`}
                        className={styles.companyCard}
                     >
                        <article>
                           <div className={styles.companyVisual}>
                              <img
                                 src={companyImageSrc}
                                 alt={`Hình minh họa môi trường làm việc của ${item.name}`}
                                 loading={index < 2 ? "eager" : "lazy"}
                              />
                              <div className={styles.companyVisualShade} />
                              <span className={styles.fieldBadge} style={{ background: fieldTone.bg, color: fieldTone.text }}>
                                 {fieldLabels[item.field] ?? item.field}
                              </span>
                              {hasRating && (
                                 <span className={styles.ratingBadge}>
                                    <Star aria-hidden="true" /> {item.rating}
                                 </span>
                              )}
                           </div>

                           <div className={styles.companyBody}>
                              <div className={styles.companyIdentity}>
                                 <div className={styles.companyLogo}>
                                    <img src={avatarSrc} alt={`${item.name} logo`} />
                                 </div>
                                 <div>
                                    <div className={styles.companyNameRow}>
                                       <h3>{item.name}</h3>
                                       {isHighlyRated && <CheckCircle2 aria-label="Doanh nghiệp được đánh giá cao" />}
                                    </div>
                                    <p><MapPin aria-hidden="true" /> {item.location}</p>
                                 </div>
                              </div>

                              <p className={styles.companyDescription}>{detailDescription}</p>

                              <div className={styles.companyMeta}>
                                 <span><Users aria-hidden="true" /> {item.employees}</span>
                                 <span><Briefcase aria-hidden="true" /> {openingCount} vị trí</span>
                              </div>

                              <div className={styles.benefitList} aria-label="Phúc lợi nổi bật">
                                 {item.benefits.slice(0, 2).map((benefit) => (
                                    <span key={benefit}>{benefit}</span>
                                 ))}
                              </div>

                              <footer className={styles.companyFooter}>
                                 <span className={styles.openingCount} style={{ color: item.color, background: `${item.color}12` }}>
                                    {openingCount > 0 ? `${openingCount} cơ hội đang chờ bạn` : "Xem hồ sơ doanh nghiệp"}
                                 </span>
                                 <span className={styles.cardAction}>
                                    Khám phá <ArrowUpRight aria-hidden="true" />
                                 </span>
                              </footer>
                           </div>
                        </article>
                     </Link>
                  );
               })}
            </div>

            {!isInitialLoading && sortedCompanies.length === 0 && (
               <div className={styles.emptyState}>
                  <div><Building2 aria-hidden="true" /></div>
                  <h3>Chưa tìm thấy công ty phù hợp</h3>
                  <p>{hasMore ? "Chưa thấy trong danh sách đã tải. Bạn có thể xem thêm công ty hoặc xóa bộ lọc." : "Thử một từ khóa khác hoặc quay lại xem toàn bộ danh bạ doanh nghiệp."}</p>
                  <button type="button" onClick={resetDirectoryFilters}>Xóa bộ lọc</button>
               </div>
            )}

            {!isInitialLoading && hasMore && (
               <div className={styles.loadMoreWrap}>
                  <button type="button" onClick={loadMoreCompanies} disabled={loadingMore} className={styles.loadMoreButton}>
                     {loadingMore ? "Đang tải doanh nghiệp..." : sortedCompanies.length === 0 ? "Tìm trong các công ty tiếp theo" : "Xem thêm công ty"}
                     {!loadingMore && <ArrowUpRight aria-hidden="true" />}
                  </button>
               </div>
            )}

            {!hasMore && apiCompanies.length > 0 && sortedCompanies.length > 0 && (
               <div className={styles.endState}>
                  <CheckCircle2 aria-hidden="true" /> Bạn đã xem hết danh sách công ty hiện có
               </div>
            )}
         </section>

         {selectedCompany && (
            <>
               <div aria-hidden="true" onClick={() => setSelectedCompany(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)", zIndex: 1000 }} />
               <div role="dialog" aria-modal="true" aria-labelledby="company-dialog-title" style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "min(760px, calc(100vw - 32px))", maxHeight: "82vh", zIndex: 1001, padding: "0" }}>
                  <div style={{ position: "relative", width: "100%", background: "#fff", borderRadius: "20px", boxShadow: "0 24px 80px rgba(15,23,42,0.35)", overflow: "hidden" }}>
                     <button id="company-dialog-close" type="button" onClick={() => setSelectedCompany(null)} aria-label="Đóng thông tin công ty" style={{ position: "absolute", top: "16px", right: "16px", width: 40, height: 40, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b", flexShrink: 0, zIndex: 10, transition: "all 0.2s ease" }}><X aria-hidden="true" style={{ width: 18, height: 18 }} /></button>
                     <div style={{ padding: "28px", paddingTop: "56px", maxHeight: "82vh", overflow: "hidden" }}>
                        <div style={{ maxHeight: "calc(82vh - 72px)", overflowY: "auto", paddingRight: "8px" }}>
                           <div style={{ position: "relative", borderRadius: "20px", overflow: "hidden", minHeight: "220px", background: "#f8fafc" }}>
                              <img src={selectedCompanyImage} alt={selectedCompany.name} style={{ width: "100%", height: "220px", objectFit: "cover", display: "block", filter: "brightness(0.72)" }} />
                              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.12), rgba(15,23,42,0.72))" }} />
                              <div style={{ position: "absolute", left: "24px", right: "24px", bottom: "24px", zIndex: 2, color: "#fff" }}>
                                 <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
                                    <div style={{ width: "76px", height: "76px", borderRadius: "22px", overflow: "hidden", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 42px rgba(0,0,0,0.28)" }}>
                                       <img src={selectedCompanyLogo} alt={`${selectedCompany.name} logo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                       <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,0.18)", padding: "8px 14px", fontSize: "12px", fontWeight: 700, color: "#fff" }}>{fieldLabels[selectedCompany.field] ?? selectedCompany.field}</span>
                                       <h2 id="company-dialog-title" style={{ margin: "12px 0 8px", fontSize: "30px", fontWeight: 900, lineHeight: 1.05 }}>{selectedCompany.name}</h2>
                                       <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.88)", lineHeight: 1.7 }}>{selectedCompany.description}</p>
                                    </div>
                                 </div>
                                 <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "18px" }}>
                                    {Number(selectedCompany.rating) > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", padding: "9px 14px", fontSize: "12px", fontWeight: 700 }}><Star aria-hidden="true" style={{ width: 14, height: 14 }} /> {selectedCompany.rating}/5</span>}
                                    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", padding: "9px 14px", fontSize: "12px", fontWeight: 700 }}><Users style={{ width: 14, height: 14 }} /> {selectedCompany.employees}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", padding: "9px 14px", fontSize: "12px", fontWeight: 700 }}><MapPin style={{ width: 14, height: 14 }} /> {selectedCompany.location}</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: "999px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)", color: "#fff", padding: "9px 14px", fontSize: "12px", fontWeight: 700 }}><Star style={{ width: 14, height: 14 }} /> {selectedCompany.positions.length} vị trí đang mở</span>
                                 </div>
                              </div>
                           </div>
                           <div style={{ marginTop: "24px", display: "grid", gap: "18px" }}>
                              <div style={{ background: "#f8fafc", padding: "22px", borderRadius: "20px", border: "1px solid #e2e8f0", boxShadow: "0 14px 40px rgba(15,23,42,0.06)" }}>
                                 <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#0f172a", margin: 0, marginBottom: "12px" }}>Giới thiệu công ty</h3>
                                 <div style={{ display: "grid", gap: "12px" }}>
                                    {getCompanyIntroduction(selectedCompany).map((line, idx) => (
                                       <p key={idx} style={{ margin: 0, color: "#475569", fontSize: "14px", lineHeight: 1.85 }}>{line}</p>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <div style={{ marginTop: "24px", display: "grid", gap: "18px" }}>
                              <div style={{ display: "grid", gap: "12px", background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                                 <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Thông tin liên hệ</h3>
                                 <div style={{ display: "grid", gap: "10px" }}>
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                       <span style={{ width: "36px", height: "36px", borderRadius: "12px", background: `${selectedCompany.color}15`, color: selectedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✉</span>
                                       <div>
                                          <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Email</p>
                                          <p style={{ margin: 0, color: "#0f172a", fontWeight: 700 }}>{selectedCompany.contact?.email}</p>
                                       </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                       <span style={{ width: "36px", height: "36px", borderRadius: "12px", background: `${selectedCompany.color}15`, color: selectedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>☎</span>
                                       <div>
                                          <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Điện thoại</p>
                                          <p style={{ margin: 0, color: "#0f172a", fontWeight: 700 }}>{selectedCompany.contact?.phone}</p>
                                       </div>
                                    </div>
                                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                       <span style={{ width: "36px", height: "36px", borderRadius: "12px", background: `${selectedCompany.color}15`, color: selectedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>🌐</span>
                                       <div>
                                          <p style={{ margin: 0, color: "#64748b", fontSize: "12px" }}>Website</p>
                                          <p style={{ margin: 0, color: selectedCompany.color, fontWeight: 700 }}>{selectedCompany.contact?.website}</p>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <div style={{ display: "grid", gap: "12px", background: "#f8fafc", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
                                 <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a", margin: 0 }}>Điều khoản & Phúc lợi</h3>
                                 <div style={{ display: "grid", gap: "10px" }}>
                                    {selectedCompany.terms?.map((term, idx) => (
                                       <div key={`term-${idx}`} style={{ padding: "12px 14px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span style={{ width: "24px", height: "24px", borderRadius: "8px", background: `${selectedCompany.color}20`, color: selectedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>✓</span>
                                          <span style={{ color: "#0f172a", fontWeight: 600 }}>{term}</span>
                                       </div>
                                    ))}
                                 </div>
                                 <div style={{ display: "grid", gap: "10px" }}>
                                    {selectedCompany.benefits.map((benefit, idx) => (
                                       <div key={`benefit-${idx}`} style={{ padding: "12px 14px", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "10px" }}>
                                          <span style={{ width: "24px", height: "24px", borderRadius: "8px", background: `${selectedCompany.color}20`, color: selectedCompany.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>★</span>
                                          <span style={{ color: "#0f172a", fontWeight: 600 }}>{benefit}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <p style={{ marginTop: "8px", color: "#475569", fontSize: "13px", fontWeight: 700 }}>{selectedCompany.positions.length} vị trí đang mở</p>
                           <div style={{ marginTop: "16px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                              {selectedCompany.positions.map((position) => (
                                 <article key={position.title} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start", flexWrap: "wrap" }}>
                                       <div style={{ flex: 1 }}>
                                          <button type="button" onClick={() => setSelectedPosition({ ...position, title: toVietnameseJobTitle(position.title), company: selectedCompany.name, place: selectedCompany.location })} style={{ padding: 0, border: 0, background: "transparent", fontSize: "16px", fontWeight: 700, color: "#0f172a", marginBottom: "8px", cursor: "pointer", textAlign: "left" }}>{toVietnameseJobTitle(position.title)}</button>
                                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#059669", fontSize: "13px", fontWeight: 700 }}><Wallet style={{ width: 14, height: 14 }} /> {position.salary}</span>
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#475569", fontSize: "13px" }}><MapPin style={{ width: 13, height: 13 }} /> {selectedCompany.location}</span>
                                             <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#475569", fontSize: "13px" }}>{position.workingHours}</span>
                                          </div>
                                          <p style={{ color: "#64748b", fontSize: "13px", lineHeight: 1.6, marginBottom: "10px" }}>{position.description}</p>
                                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>{position.skills.map((skill) => <span key={skill} style={{ background: "#e0f2fe", color: "#0369a1", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{skill}</span>)}</div>
                                       </div>
                                       <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                                          <button type="button" onClick={() => addSavedJob({ id: position.id, company: selectedCompany.name, title: toVietnameseJobTitle(position.title), place: selectedCompany.location, salary: position.salary, field: selectedCompany.field, description: position.description, type: position.workingHours, companyColor: selectedCompany.color, savedFrom: selectedCompany.name })} style={{ width: 38, height: 38, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#64748b" }} aria-label={`Lưu công việc ${toVietnameseJobTitle(position.title)}`}><Bookmark aria-hidden="true" style={{ width: 15, height: 15 }} /></button>
                                          <button type="button" onClick={() => addApplication({ id: position.id, company: selectedCompany.name, title: toVietnameseJobTitle(position.title), place: selectedCompany.location, salary: position.salary, field: selectedCompany.field, description: position.description, type: position.workingHours, companyColor: selectedCompany.color, companyDescription: selectedCompany.description, image: selectedCompany.image ?? companyAvatars[0] })} style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: selectedCompany.color, color: "#fff", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: `0 4px 14px ${selectedCompany.color}40` }}>Ứng tuyển</button>
                                       </div>
                                    </div>
                                 </article>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </>
         )}

         {toast && (
            <div role={toast.kind === "error" ? "alert" : "status"} aria-live={toast.kind === "error" ? "assertive" : "polite"} style={{ position: "fixed", left: "50%", top: 24, transform: "translateX(-50%)", zIndex: 1300, minWidth: "min(520px, calc(100vw - 24px))" }}>
               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${toast.kind === "success" ? "#86efac" : "#fca5a5"}`, background: toast.kind === "success" ? "linear-gradient(135deg, #f0fdf4, #ffffff)" : "linear-gradient(135deg, #fff1f2, #ffffff)", boxShadow: "0 18px 50px rgba(15,23,42,0.16)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                     <div style={{ width: 10, height: 10, borderRadius: 999, background: toast.kind === "success" ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
                     <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{toast.message}</p>
                  </div>
                  <button type="button" onClick={() => setToast(null)} aria-label="Đóng thông báo" style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>×</button>
               </div>
            </div>
         )}
      </div>
   );
}
