import { companyAvatars } from "../companies/companyAssets";

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
   image: any;
   companyUrl: string;
   slug?: string;
   requirements?: string;
   benefits?: string;
   jobLevel?: string;
   experienceYears?: any;
   expiredAt?: string;
   locationAddress?: string;
   [key: string]: any;
};

export const mockJobs: Job[] = [
   {
      title: "Frontend React Developer",
      company: "NovaTech",
      companyColor: "#6366f1",
      companyDescription: "NovaTech là công ty công nghệ hàng đầu, chuyên phát triển phần mềm và giải pháp số cho doanh nghiệp.",
      description: "Phát triển giao diện người dùng với React, TypeScript và Figma. Tham gia vào các dự án web hiện đại.",
      place: "TP. HCM",
      field: "Công nghệ thông tin",
      type: "Full-time",
      salary: "25–35 triệu",
      tags: ["React", "TypeScript", "Figma"],
      hot: true,
      posted: "2 ngày trước",
      image: companyAvatars[0],
      companyUrl: "/cong-ty",
   },
   {
      title: "UI/UX Designer",
      company: "BluePixel",
      companyColor: "#ec4899",
      companyDescription: "BluePixel chuyên thiết kế trải nghiệm người dùng sáng tạo và giải pháp thiết kế đồ họa.",
      description: "Thiết kế giao diện và trải nghiệm người dùng cho ứng dụng di động và web. Sử dụng Figma và prototyping.",
      place: "Hà Nội",
      field: "Công nghệ thông tin",
      type: "Hybrid",
      salary: "18–28 triệu",
      tags: ["Figma", "Prototyping", "User Research"],
      hot: false,
      posted: "1 ngày trước",
      image: companyAvatars[1],
      companyUrl: "/cong-ty",
   },
   {
      title: "Backend Node.js Engineer",
      company: "ScaleHub",
      companyColor: "#f59e0b",
      companyDescription: "ScaleHub cung cấp dịch vụ đám mây và hạ tầng kỹ thuật cho các doanh nghiệp quy mô lớn.",
      description: "Xây dựng hệ thống backend với Node.js, MongoDB và Docker. Đảm bảo hiệu suất và bảo mật.",
      place: "Đà Nẵng",
      field: "Công nghệ thông tin",
      type: "Remote",
      salary: "30–45 triệu",
      tags: ["Node.js", "MongoDB", "Docker"],
      hot: true,
      posted: "Hôm nay",
      image: companyAvatars[2],
      companyUrl: "/cong-ty",
   },
   {
      title: "Chuyên viên Digital Marketing",
      company: "GrowthBee",
      companyColor: "#14b8a6",
      companyDescription: "GrowthBee tập trung vào tăng trưởng thương hiệu thông qua dữ liệu và performance marketing.",
      description: "Xây dựng chiến dịch quảng cáo đa kênh, tối ưu chuyển đổi và báo cáo hiệu quả theo tuần.",
      place: "TP. HCM",
      field: "Marketing/Quảng cáo",
      type: "Full-time",
      salary: "18–30 triệu",
      tags: ["Google Ads", "Meta Ads", "GA4"],
      hot: false,
      posted: "3 ngày trước",
      image: companyAvatars[1],
      companyUrl: "/cong-ty",
   },
   {
      title: "Nhân viên kinh doanh B2B",
      company: "SaleSphere",
      companyColor: "#0ea5e9",
      companyDescription: "SaleSphere là nền tảng hỗ trợ bán hàng B2B cho doanh nghiệp vừa và nhỏ.",
      description: "Tìm kiếm khách hàng doanh nghiệp, tư vấn giải pháp và chốt hợp đồng theo chỉ tiêu tháng.",
      place: "Hà Nội",
      field: "Kinh doanh/Bán hàng",
      type: "Full-time",
      salary: "15–25 triệu",
      tags: ["Tư vấn", "Đàm phán", "CRM"],
      hot: true,
      posted: "Hôm qua",
      image: companyAvatars[0],
      companyUrl: "/cong-ty",
   },
   {
      title: "Kế toán tổng hợp",
      company: "Finverse",
      companyColor: "#f59e0b",
      companyDescription: "Finverse cung cấp dịch vụ tài chính số và quản lý tài sản cá nhân.",
      description: "Theo dõi dòng tiền, lập báo cáo tài chính và phối hợp với kiểm toán nội bộ.",
      place: "Đà Nẵng",
      field: "Kế toán",
      type: "Hybrid",
      salary: "15–25 triệu",
      tags: ["Excel", "MISA", "Thuế"],
      hot: false,
      posted: "4 ngày trước",
      image: companyAvatars[2],
      companyUrl: "/cong-ty",
   },
];
