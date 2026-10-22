import type { ApiCompany } from "../../services/companiesApi";
import { cleanApiText, splitApiText } from "../../utils/content";
import { fallbackCompanyImage, fallbackCompanyLogo } from "./companyAssets";

/** Công ty đã chuẩn hoá để hiển thị trong danh bạ doanh nghiệp. */
export type CompanyItem = {
   name: string;
   slug: string;
   field: string;
   employees: string;
   location: string;
   openJobs: number;
   color: string;
   description: string;
   benefits: string[];
   logo: string;
   image: string;
};

type ApiPosition = NonNullable<ApiCompany["positions"]>[number];

/** Tin còn hiệu lực: đã đăng, chưa xoá, chưa hết hạn. */
export const isOpenPosition = (position: ApiPosition): boolean => {
   if (position.status && position.status !== "PUBLISHED") return false;
   if (position.isDeleted) return false;
   if (!position.expiredAt) return true;
   const expiredAt = new Date(position.expiredAt);
   return Number.isNaN(expiredAt.getTime()) || expiredAt.getTime() > Date.now();
};

/** Chuỗi không dấu, chữ thường, nối bằng "-" để so khớp tên và tìm kiếm. */
export const normalizeName = (name: string) =>
   name
      .trim()
      .normalize("NFD")
      .replace(/[đĐ]/g, (c) => (c === "đ" ? "d" : "D"))
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

export const fieldColors: Record<string, { bg: string; text: string }> = {
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

export const fieldLabels: Record<string, string> = {
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

export const mapApiCompany = (apiCompany: ApiCompany): CompanyItem => {
   const openPositions = (apiCompany.positions ?? []).filter(isOpenPosition);
   const jobLocation = openPositions
      .map((position) => position.locationCity)
      .find((location): location is string => typeof location === "string" && Boolean(location.trim()));
   const location = cleanApiText(apiCompany.headquarters) || jobLocation || "";
   const industry = cleanApiText(apiCompany.industry)
      || cleanApiText(openPositions.find((position) => position.industry)?.industry)
      || "Chưa được cung cấp";

   const companyBenefits = splitApiText(apiCompany.benefits, 4);
   const positionBenefits = Array.from(new Set(openPositions.flatMap((position) => splitApiText(position.benefits, 2))));
   const benefits = companyBenefits.length
      ? companyBenefits
      : positionBenefits.length
         ? positionBenefits.slice(0, 4)
         : ["Doanh nghiệp chưa cung cấp thông tin phúc lợi"];

   const recruitmentSummary = openPositions.length
      ? `${openPositions.length} vị trí đang tuyển tại ${location || "địa điểm được nêu trong tin tuyển dụng"}.`
      : "Doanh nghiệp hiện chưa có vị trí tuyển dụng đang mở.";

   return {
      name: apiCompany.name,
      slug: apiCompany.slug || normalizeName(apiCompany.name),
      field: industry,
      employees: apiCompany.size || "Đang cập nhật",
      location: location || "Đang cập nhật",
      openJobs: openPositions.length,
      color: apiCompany.color || "#047857",
      description: cleanApiText(apiCompany.description) || recruitmentSummary,
      benefits,
      logo: apiCompany.logoUrl || fallbackCompanyLogo(apiCompany.name),
      image: fallbackCompanyImage(apiCompany.name),
   };
};
