export type ApplicationStatusBucket = "pending" | "review" | "interview" | "success" | "rejected" | "neutral";

export type ApplicationStatusTone = "amber" | "sky" | "emerald" | "rose" | "slate";

export interface ApplicationStatusMeta {
   label: string;
   note: string;
   tone: ApplicationStatusTone;
   bucket: ApplicationStatusBucket;
}

const normalizeText = (value?: string) =>
   value
      ?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim() ?? "";

export function getApplicationStatusMeta(status?: string): ApplicationStatusMeta {
   const normalized = normalizeText(status);

   if (!normalized) {
      return {
         label: "Đang chờ xác nhận",
         note: "Hồ sơ đã được ghi nhận và đang đợi nhà tuyển dụng phản hồi.",
         tone: "amber",
         bucket: "pending",
      };
   }

   if (normalized.includes("phong van")) {
      return {
         label: "Mời phỏng vấn",
         note: "Nhà tuyển dụng đã phản hồi và đang sắp xếp vòng trao đổi tiếp theo.",
         tone: "emerald",
         bucket: "interview",
      };
   }

   if (
      normalized.includes("trung tuyen") ||
      normalized.includes("offer") ||
      normalized.includes("da nhan viec") ||
      normalized.includes("nhan viec")
   ) {
      return {
         label: "Trúng tuyển",
         note: "Ứng tuyển đã thành công và bạn có thể tiếp tục bước nhận việc.",
         tone: "emerald",
         bucket: "success",
      };
   }

   if (normalized.includes("tu choi") || normalized.includes("khong phu hop") || normalized.includes("khong dat")) {
      return {
         label: "Không phù hợp",
         note: "Hồ sơ chưa phù hợp với vòng tuyển chọn hiện tại.",
         tone: "rose",
         bucket: "rejected",
      };
   }

   if (normalized.includes("da nop") || normalized.includes("tiep nhan") || normalized.includes("nhan ho so")) {
      return {
         label: "Hồ sơ đã tiếp nhận",
         note: "Ứng tuyển đã được ghi nhận và đang nằm trong hàng chờ xử lý.",
         tone: "sky",
         bucket: "review",
      };
   }

   if (normalized.includes("dang cho") || normalized.includes("cho phan hoi") || normalized.includes("pending")) {
      return {
         label: "Đang chờ xác nhận",
         note: "Hồ sơ vẫn đang đợi nhà tuyển dụng xác nhận hoặc phản hồi.",
         tone: "amber",
         bucket: "pending",
      };
   }

   return {
      label: status?.trim() ?? "Trạng thái khác",
      note: "Trạng thái tùy chỉnh do hệ thống lưu lại.",
      tone: "slate",
      bucket: "neutral",
   };
}