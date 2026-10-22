import type { StaticImageData } from "next/image";
import { companyAvatars } from "../companies/companyAssets";
import type { ApiJob } from "../../services/jobsApi";
import { cleanApiText } from "../../utils/content";
import { formatSalaryRange } from "../../utils/salary";

/** Job đã được chuẩn hoá để hiển thị trên các trang tìm việc. */
export type Job = {
   id?: number;
   title: string;
   company: string;
   companyColor: string;
   companyDescription: string;
   description: string;
   place: string;
   field: string;
   type: string;
   salary: string;
   tags: string[];
   hot: boolean;
   posted: string;
   image: string | StaticImageData;
   companyUrl: string;
   slug?: string;
   requirements?: string;
   benefits?: string;
   jobLevel?: string;
   experienceYears?: string;
   expiredAt?: string;
   /** Đã đóng hoặc quá hạn nộp: hiển thị nhưng không cho ứng tuyển */
   expired: boolean;
   /** "dd/mm/yyyy" hoặc null khi tin không có hạn nộp */
   deadline: string | null;
   locationAddress?: string;
};

const formatDate = (value?: string): string | null => {
   if (!value) return null;
   const date = new Date(value);
   return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("vi-VN");
};

export const jobLevelLabels: Record<string, string> = {
   NHAN_VIEN: "Nhân viên",
   THUC_TAP_SINH: "Thực tập sinh",
   TRUONG_NHOM: "Trưởng nhóm",
   QUAN_LY_GIAM_SAT: "Quản lý/Giám sát",
   TRUONG_PHO_PHONG: "Trưởng/Phó phòng",
   GIAM_DOC: "Giám đốc",
   PHO_GIAM_DOC: "Phó giám đốc",
   TRUONG_CHI_NHANH: "Trưởng chi nhánh",
};

export const jobTypeOptions = [
   { value: "FULL_TIME", label: "Toàn thời gian" },
   { value: "PART_TIME", label: "Bán thời gian" },
   { value: "INTERNSHIP", label: "Thực tập" },
];

export const locationOptions = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Toàn Quốc"];

const jobTypeLabels: Record<string, string> = {
   FULL_TIME: "Toàn thời gian",
   PART_TIME: "Bán thời gian",
   INTERNSHIP: "Thực tập",
   CONTRACT: "Hợp đồng",
   HYBRID: "Hybrid",
   REMOTE: "Remote",
};

export const formatJobType = (value?: string): string => jobTypeLabels[value || ""] ?? "Đang cập nhật";

export const formatExperience = (value?: string): string => {
   const normalized = String(value ?? "").trim();
   if (!normalized) return "Kinh nghiệm chưa cập nhật";
   if (/không\s*yêu\s*cầu/i.test(normalized)) return "Không yêu cầu kinh nghiệm";
   if (/(năm|tháng|kinh nghiệm)/i.test(normalized)) return normalized;
   return `${normalized} năm kinh nghiệm`;
};

export const formatLocation = (city?: string, address?: string): string => {
   const source = `${city ?? ""} ${address ?? ""}`;
   if (/hà nội/i.test(source)) return "Hà Nội";
   if (/(hồ chí minh|tp\.?\s*hcm|thành phố hồ chí minh)/i.test(source)) return "Hồ Chí Minh";
   if (/đà nẵng/i.test(source)) return "Đà Nẵng";
   if (/toàn quốc/i.test(source)) return "Toàn Quốc";
   return cleanApiText(city) || "Việt Nam";
};

export const mapApiJob = (apiJob: ApiJob): Job => {
   const place = formatLocation(apiJob.locationCity, apiJob.locationAddress);
   return {
      id: apiJob.id,
      title: apiJob.title,
      company: apiJob.company?.name || "",
      companyColor: apiJob.company?.color || "#0ea5e9",
      companyDescription: cleanApiText(apiJob.company?.description),
      description: cleanApiText(apiJob.description),
      requirements: cleanApiText(apiJob.requirements),
      benefits: cleanApiText(apiJob.benefits),
      place,
      locationAddress: apiJob.locationAddress,
      field: cleanApiText(apiJob.industry) || "Nhóm ngành khác",
      type: formatJobType(apiJob.jobType),
      salary: formatSalaryRange(apiJob.salaryMin, apiJob.salaryMax),
      // Địa điểm đã có chip riêng nên không lặp lại trong tag
      tags: [
         apiJob.jobLevel ? (jobLevelLabels[apiJob.jobLevel] ?? apiJob.jobLevel) : null,
         apiJob.experienceYears ? formatExperience(apiJob.experienceYears) : null,
      ].filter((tag): tag is string => Boolean(tag)),
      hot: false,
      posted: apiJob.expired ? `Hết hạn ${formatDate(apiJob.expiredAt) ?? ""}`.trim() : "Vừa cập nhật",
      expired: Boolean(apiJob.expired),
      deadline: formatDate(apiJob.expiredAt),
      image: apiJob.company?.logoUrl || companyAvatars[0],
      companyUrl: `/cong-ty/${apiJob.company?.slug ?? ""}`,
      slug: apiJob.slug,
      jobLevel: apiJob.jobLevel,
      experienceYears: apiJob.experienceYears,
      expiredAt: apiJob.expiredAt,
   };
};
