import { ChevronDown, FileText, Plus } from "lucide-react";
import type { ApiUserCv } from "../../../services/cvApi";

type Props = {
  savedCvs: ApiUserCv[];
  selectedCvId: number | "";
  onSelectCv: (id: number) => void;
  onCreateNew: () => void;
};

export default function EditorHeader({ savedCvs, selectedCvId, onSelectCv, onCreateNew }: Props) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3 bg-white p-5 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="p-2 bg-violet-100 rounded-xl text-violet-600">
            <FileText className="w-5 h-5" />
          </div>
          Trình chỉnh sửa CV
        </h1>
        <p className="text-slate-500 text-[13.5px] mt-1.5 font-medium">Tạo ấn tượng chuyên nghiệp với mẫu CV được tối ưu hóa</p>
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto">
        {savedCvs.length > 0 && (
          <div className="relative flex-1 md:w-64">
            <select
              aria-label="Mở một CV đã lưu"
              value={selectedCvId}
              onChange={(e) => e.target.value && onSelectCv(Number(e.target.value))}
              className="w-full appearance-none pl-4 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[14px] font-semibold text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 transition-all cursor-pointer"
            >
              <option value="">-- Mở CV đã lưu --</option>
              {savedCvs.map((cv) => (
                <option key={cv.id} value={cv.id}>
                  {cv.cvName || cv.fullName || "CV không tên"} {cv.createdAt ? `(${new Date(cv.createdAt).toLocaleDateString("vi-VN")})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        )}

        <button
          type="button"
          onClick={onCreateNew}
          className="px-5 py-3 bg-slate-100 text-slate-700 rounded-xl text-[14px] font-bold hover:bg-slate-200 hover:text-slate-900 transition-all flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo mới</span>
        </button>
      </div>
    </div>
  );
}
