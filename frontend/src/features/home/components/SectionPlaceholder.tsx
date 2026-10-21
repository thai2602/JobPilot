import type { SectionStatus } from "../useHomeData";

const messages: Record<SectionStatus, string> = {
   loading: "Đang tải dữ liệu...",
   error: "Không tải được dữ liệu. Vui lòng tải lại trang sau.",
   ready: "Chưa có dữ liệu để hiển thị.",
};

/** Ô thay thế khi một khu vực đang tải, lỗi, hoặc không có dữ liệu. */
export default function SectionPlaceholder({ status, height = 160 }: { status: SectionStatus; height?: number }) {
   return (
      <div
         role={status === "error" ? "alert" : "status"}
         className={`flex items-center justify-center rounded-[12px] border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center text-sm font-medium ${status === "error" ? "text-rose-600" : "text-slate-500"} ${status === "loading" ? "animate-pulse" : ""}`}
         style={{ minHeight: height }}
      >
         {messages[status]}
      </div>
   );
}
