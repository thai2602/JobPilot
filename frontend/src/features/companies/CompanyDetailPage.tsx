'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Building2, MapPin, Star, Users, Wallet, Briefcase, ArrowUpRight, Check } from "lucide-react";
import { mockCompanies as companies } from "./mockCompanies";
import { companyAvatars, companyImages } from "./companyAssets";
import { generateSlug } from "../../utils/slug";
import { formatSalaryRange } from "../../utils/salary";
import { cleanApiText, splitApiText } from "../../utils/content";
import { companiesApi, type ApiCompany } from "../../services/companiesApi";

type CompanyPosition = {
   id?: number;
   slug?: string;
   title: string;
   salary: string;
   workingHours: string;
   description: string;
   skills: string[];
};

type CompanyItem = {
   id?: number;
   name: string;
   tagline: string;
   logo: any;
   heroImage: any;
   rating: any;
   reviewCount: number;
   employees: string;
   location: string;
   openPositionsCount: number;
   field: string;
   benefits: string[];
   overview: string[];
   skills: string[];
   openPositions: CompanyPosition[];
};

function normalizeName(name: string): string {
   return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const jobLevelLabels: Record<string, string> = {
   NHAN_VIEN: "Nhân viên",
   THUC_TAP_SINH: "Thực tập sinh",
   TRUONG_NHOM: "Trưởng nhóm",
   QUAN_LY_GIAM_SAT: "Quản lý/Giám sát",
   TRUONG_PHO_PHONG: "Trưởng/Phó phòng",
   GIAM_DOC: "Giám đốc",
   PHO_GIAM_DOC: "Phó giám đốc",
   TRUONG_CHI_NHANH: "Trưởng chi nhánh",
};

const jobTypeLabels: Record<string, string> = {
   FULL_TIME: "Toàn thời gian",
   PART_TIME: "Bán thời gian",
   INTERNSHIP: "Thực tập",
   CONTRACT: "Hợp đồng",
   HYBRID: "Hybrid",
   REMOTE: "Remote",
};

const formatExperience = (value?: string): string => {
   const normalized = cleanApiText(value);
   if (!normalized) return "Kinh nghiệm đang cập nhật";
   if (/không\s*yêu\s*cầu/i.test(normalized)) return "Không yêu cầu kinh nghiệm";
   if (/(năm|tháng|kinh nghiệm)/i.test(normalized)) return normalized;
   return `${normalized} năm kinh nghiệm`;
};

const isOpenPosition = (position: NonNullable<ApiCompany["positions"]>[number]): boolean => {
   if (position.status && position.status !== "PUBLISHED") return false;
   if (position.isDeleted) return false;
   if (!position.expiredAt) return true;
   const expiredAt = new Date(position.expiredAt);
   return Number.isNaN(expiredAt.getTime()) || expiredAt.getTime() > Date.now();
};

const uniqueValues = (values: string[], limit = 8): string[] =>
   Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit);

export default function CompanyDetailPage() {
   const router = useRouter();
   const params = useParams();
   const companySlug = (params?.companySlug as string) || "";
   const [company, setCompany] = useState<CompanyItem | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [failedLogoSrc, setFailedLogoSrc] = useState("");
   const [failedHeroSrc, setFailedHeroSrc] = useState("");

   useEffect(() => {
      if (!companySlug) {
         setIsLoading(false);
         return;
      }
      companiesApi.getBySlug(companySlug)
         .then((apiItem: ApiCompany) => {
            const staticMatch = companies.find((c) => normalizeName(c.name) === normalizeName(apiItem.name));
            const openApiPositions = (apiItem.positions ?? []).filter(isOpenPosition);
            const mappedPositions = openApiPositions.map((pos) => ({
               id: pos.id,
               slug: pos.slug,
               title: pos.title,
               salary: formatSalaryRange(pos.salaryMin, pos.salaryMax),
               workingHours: jobTypeLabels[pos.jobType || ""] || "Hình thức đang cập nhật",
               description: cleanApiText(pos.description) || "Mô tả công việc đang được cập nhật.",
               skills: uniqueValues([
                  jobLevelLabels[pos.jobLevel || ""] || cleanApiText(pos.jobLevel),
                  formatExperience(pos.experienceYears),
                  ...cleanApiText(pos.requirements)
                     .split(/[,;|]/)
                     .map((skill) => skill.trim())
                     .filter((skill) => skill.length > 1 && skill.length <= 42),
               ], 5),
            }));

            const companyBenefits = splitApiText(apiItem.benefits, 8);
            const positionBenefits = uniqueValues(
               openApiPositions.flatMap((position) => splitApiText(position.benefits, 5)),
               8,
            );
            const benefits = companyBenefits.length
               ? companyBenefits
               : positionBenefits.length
                  ? positionBenefits
                  : ["Doanh nghiệp chưa cung cấp thông tin phúc lợi."];
            const positionSkills = uniqueValues(mappedPositions.flatMap((position) => position.skills), 8);
            const staticLogo = staticMatch
               ? typeof staticMatch.image === "string" ? staticMatch.image : (staticMatch.image as any)?.src || ""
               : "";
            const staticHero = staticMatch
               ? typeof staticMatch.companyImage === "string" ? staticMatch.companyImage : (staticMatch.companyImage as any)?.src || ""
               : "";
            const location = cleanApiText(openApiPositions[0]?.locationAddress)
               || cleanApiText(openApiPositions[0]?.locationCity)
               || cleanApiText(apiItem.headquarters)
               || "Chưa được cung cấp";
            const industry = cleanApiText(apiItem.industry)
               || cleanApiText(openApiPositions.find((position) => position.industry)?.industry)
               || "Chưa được cung cấp";
            const description = cleanApiText(apiItem.description);
            const recruitingTitles = mappedPositions
               .slice(0, 2)
               .map((position) => position.title)
               .join(" và ");
            const recruitmentSummary = mappedPositions.length
               ? `${apiItem.name} hiện có ${mappedPositions.length} vị trí đang tuyển${recruitingTitles ? `: ${recruitingTitles}` : ""}.`
               : `${apiItem.name} hiện chưa có vị trí tuyển dụng đang mở.`;
            const overview = description
               || `Doanh nghiệp chưa cung cấp phần giới thiệu chính thức. ${recruitmentSummary}`;

            setCompany({
               id: apiItem.id,
               name: apiItem.name,
               tagline: description || recruitmentSummary,
               logo: apiItem.logoUrl || staticLogo,
               heroImage: staticHero,
               rating: null,
               reviewCount: 0,
               employees: apiItem.size || "Chưa được cung cấp",
               location,
               openPositionsCount: mappedPositions.length,
               field: industry,
               benefits,
               overview: [overview],
               skills: positionSkills.length ? positionSkills : ["Doanh nghiệp chưa cung cấp yêu cầu chuyên môn"],
               openPositions: mappedPositions,
            });
         })
         .catch((err) => {
            console.error("Lỗi lấy thông tin công ty từ API, dùng dữ liệu dự phòng:", err);
            const found = companies.find((c) => {
               const slug = generateSlug(c.name);
               return slug === companySlug || normalizeName(c.name) === normalizeName(companySlug);
            });
            if (found) {
               setCompany({
                  id: 0,
                  name: found.name,
                  tagline: found.description || "Doanh nghiệp uy tín hàng đầu",
                  logo: typeof found.image === 'string' ? found.image : (found.image as any)?.src || (companyAvatars[0] as any)?.src || "",
                  heroImage: typeof found.companyImage === 'string' ? found.companyImage : (found.companyImage as any)?.src || (companyImages[0] as any)?.src || "",
                  rating: found.rating || "4.8",
                  reviewCount: 15,
                  employees: found.employees || "100-500 nhân viên",
                  location: found.location || "Việt Nam",
                  openPositionsCount: found.positions?.length || 0,
                  field: found.field || "Công nghệ",
                  benefits: found.benefits || [],
                  overview: found.introduction ? [found.introduction] : [found.description || ""],
                  skills: ["Phát triển sản phẩm", "Làm việc nhóm", "Chuyên môn cao"],
                  openPositions: found.positions || [],
               });
            } else {
               setCompany(null);
            }
         })
         .finally(() => {
            setIsLoading(false);
         });
   }, [companySlug]);

   if (isLoading) {
      return (
         <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-sm font-semibold text-slate-500">Đang tải thông tin công ty...</p>
         </div>
      );
   }

   if (!company) {
      return (
         <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <h2 className="text-xl font-bold text-slate-800">Không tìm thấy công ty</h2>
            <p className="text-sm text-slate-500">Công ty bạn đang tìm kiếm không tồn tại hoặc đã bị gỡ bỏ.</p>
            <Link
               href="/cong-ty"
               className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
               Quay lại danh sách công ty
            </Link>
         </div>
      );
   }

   const logoSrc = typeof company.logo === "string" ? company.logo : company.logo?.src || "";
   const heroSrc = typeof company.heroImage === "string" ? company.heroImage : company.heroImage?.src || "";
   const showLogo = Boolean(logoSrc && logoSrc !== failedLogoSrc);
   const showHero = Boolean(heroSrc && heroSrc !== failedHeroSrc);

   return (
      <div className="space-y-8" style={{ fontFamily: 'var(--font-body)' }}>
         {/* Hero Banner */}
         <div className="relative overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="relative h-52 w-full overflow-hidden bg-gradient-to-br from-emerald-100 via-slate-100 to-cyan-100 md:h-72">
               {showHero && (
                  <img
                     src={heroSrc}
                     alt=""
                     aria-hidden="true"
                     onError={() => setFailedHeroSrc(heroSrc)}
                     className="h-full w-full object-cover"
                  />
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-slate-900/5 to-white/10" />
            </div>

            <div className="relative px-6 pb-8 md:px-8">
               <div className="-mt-12 mb-6 grid gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5 md:-mt-16 md:grid-cols-[128px_minmax(0,1fr)]">
                  <div className="h-24 w-24 shrink-0 rounded-2xl border-2 border-white bg-white p-2 shadow-xl md:h-32 md:w-32">
                     <div className="relative grid h-full w-full place-items-center overflow-hidden rounded-xl bg-emerald-50 text-emerald-700">
                        <Building2 className="h-9 w-9 md:h-11 md:w-11" aria-hidden="true" />
                        {showLogo && (
                           <img
                              src={logoSrc}
                              alt=""
                              aria-hidden="true"
                              onError={() => setFailedLogoSrc(logoSrc)}
                              className="absolute inset-0 h-full w-full bg-white object-contain"
                           />
                        )}
                     </div>
                  </div>

                  <div className="min-w-0 space-y-1 sm:pt-14 md:pt-[72px]">
                     <h1 className="break-words text-2xl font-black text-slate-900 md:text-3xl" style={{ fontFamily: 'var(--font-heading)' }}>
                        {company.name}
                     </h1>
                     <p className="line-clamp-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{company.tagline}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quy mô</p>
                     <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-emerald-600" /> {company.employees}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Địa điểm</p>
                     <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" /> {company.location}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ngành nghề</p>
                     <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-emerald-600" /> {company.field}
                     </p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đánh giá</p>
                     <p className={`text-sm font-extrabold flex items-center gap-1.5 ${company.rating ? "text-amber-600" : "text-slate-500"}`}>
                        <Star className={`w-4 h-4 ${company.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                        {company.rating ? `${company.rating} (${company.reviewCount} đánh giá)` : "Chưa có đánh giá"}
                     </p>
                  </div>
               </div>
            </div>
         </div>

         {/* Content Grid */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main column */}
            <div className="lg:col-span-2 space-y-8">
               {/* Overview */}
               <div className="rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-4">
                  <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3">Giới thiệu tổng quan</h2>
                  <div className="space-y-3 text-sm text-slate-700 leading-relaxed font-medium">
                     {company.overview.map((para, i) => (
                        <p key={i}>{para}</p>
                     ))}
                  </div>
               </div>

               {/* Open Positions List */}
               <div className="rounded-[24px] border border-slate-200 bg-white p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                     <h2 className="text-lg font-black text-slate-900">Vị trí đang tuyển dụng ({company.openPositions.length})</h2>
                  </div>

                  <div className="space-y-4">
                     {company.openPositions.length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 text-center">Hiện chưa có vị trí tuyển dụng mở trực tiếp.</p>
                     ) : (
                        company.openPositions.map((pos, idx) => (
                           <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3 hover:border-emerald-200 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                 <h3 className="font-extrabold text-slate-900 text-base">{pos.title}</h3>
                                 <span className="text-sm font-black text-emerald-600">{pos.salary}</span>
                              </div>
                              <p className="text-xs text-slate-600 font-medium line-clamp-2">{pos.description}</p>
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                 <div className="flex flex-wrap gap-1.5">
                                    {pos.skills.map((s, si) => (
                                       <span key={si} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 border border-slate-200">
                                          {s}
                                       </span>
                                    ))}
                                 </div>
                                 <Link
                                    href={pos.slug ? `/tim-viec/${encodeURIComponent(pos.slug)}` : `/tim-viec?search=${encodeURIComponent(pos.title)}`}
                                    className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 hover:text-emerald-800"
                                 >
                                    Ứng tuyển ngay <ArrowUpRight className="w-3.5 h-3.5" />
                                 </Link>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>

            {/* Sidebar column */}
            <div className="space-y-6">
               {/* Benefits */}
               <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Phúc lợi công ty</h3>
                  <ul className="space-y-2.5">
                     {company.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                           <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center shrink-0 mt-0.5">✓</span>
                           {benefit}
                        </li>
                      ))}
                  </ul>
               </div>

               {/* Tech / Skills tags */}
               <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">Chuyên môn & Đào tạo</h3>
                  <div className="flex flex-wrap gap-2">
                     {company.skills.map((skill, i) => (
                        <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                           {skill}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
