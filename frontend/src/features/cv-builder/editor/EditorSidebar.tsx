import { Bot, Eye, EyeOff, Palette, Save, Upload } from "lucide-react";
import { useCvContext } from "../CvContext";
import { ACCENT_COLORS, TEMPLATE_OPTIONS } from "./cvEditorData";
import { TaskProgress, type StagedProgress } from "./progress";
import type { SaveStatus } from "./useCvDocument";

const saveLabels: Record<Exclude<SaveStatus, "idle">, string> = {
  saving: "Đang lưu...",
  success: "Đã lưu thành công!",
  error: "Lỗi lưu CV",
};

const saveAnnouncements: Record<SaveStatus, string> = {
  idle: "",
  saving: "Đang lưu CV",
  success: "Đã lưu CV thành công",
  error: "Lưu CV thất bại",
};

type Props = {
  isUploading: boolean;
  uploadProgress: StagedProgress;
  onUploadPdf: (file: File) => void;
  isAiReviewVisible: boolean;
  isAiBusy: boolean;
  aiProgress: StagedProgress;
  onToggleAiReview: () => void;
  isPreviewVisible: boolean;
  onTogglePreview: () => void;
  saveStatus: SaveStatus;
  isExistingCv: boolean;
  onSave: () => void;
};

function ToolsCard(props: Props) {
  const { isUploading, uploadProgress, isAiReviewVisible, isAiBusy, aiProgress, isPreviewVisible, saveStatus } = props;
  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
      <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-1">Công cụ hỗ trợ</h2>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:flex 2xl:flex-col">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => document.getElementById("cv-upload-input")?.click()}
            aria-controls="cv-upload-input"
            disabled={isUploading}
            className="group relative flex w-full items-center gap-3 overflow-hidden rounded-xl bg-violet-50 px-4 py-3.5 text-[14px] font-bold text-violet-700 transition-all hover:bg-violet-100 disabled:cursor-wait disabled:opacity-70"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-violet-200/0 via-violet-200/50 to-violet-200/0 group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <Upload className={`w-5 h-5 transition-transform ${isUploading ? "animate-pulse" : "group-hover:-translate-y-0.5"}`} />
            {isUploading ? `Đang xử lý ${Math.max(1, uploadProgress.progress)}%` : "Tải CV có sẵn (PDF)"}
          </button>
          <input
            id="cv-upload-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Xoá giá trị để chọn lại cùng một file vẫn kích hoạt onChange
              e.target.value = "";
              if (file) props.onUploadPdf(file);
            }}
          />
          {uploadProgress.progress > 0 && (
            <TaskProgress
              value={uploadProgress.progress}
              label={uploadProgress.progress === 100 ? "Đã nhập dữ liệu CV" : "Tải lên & trích xuất PDF"}
              tone="violet"
            />
          )}
        </div>

        <div className="min-w-0">
          <button
            type="button"
            onClick={props.onToggleAiReview}
            aria-pressed={isAiReviewVisible}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-[14px] font-bold transition-all cursor-pointer ${isAiReviewVisible
              ? "bg-emerald-700 text-white shadow-[0_8px_20px_rgba(5,150,105,0.25)] hover:bg-emerald-800"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
          >
            <Bot className={`w-5 h-5 ${isAiBusy ? "animate-bounce" : ""}`} />
            {isAiBusy
              ? `AI đang chấm ${Math.max(1, aiProgress.progress)}%`
              : isAiReviewVisible ? "Đóng AI Nhận xét" : "AI Chấm điểm CV"}
          </button>
          {aiProgress.progress > 0 && (
            <TaskProgress
              value={aiProgress.progress}
              label={aiProgress.progress === 100 ? "AI đã hoàn tất nhận xét" : "AI đang phân tích CV"}
              tone="emerald"
            />
          )}
        </div>

        <button
          type="button"
          onClick={props.onTogglePreview}
          aria-pressed={isPreviewVisible}
          className={`w-full px-4 py-3.5 rounded-xl text-[14px] font-bold transition-all flex items-center gap-3 cursor-pointer ${isPreviewVisible
            ? "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700"
            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
        >
          {isPreviewVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {isPreviewVisible ? "Ẩn Xem trước" : "Xem trước CV"}
        </button>

        <div className="hidden h-px bg-slate-100 my-3 2xl:block"></div>

        <button
          type="button"
          onClick={props.onSave}
          disabled={saveStatus === "saving"}
          className="w-full px-4 py-4 bg-slate-900 text-white hover:bg-slate-800 rounded-xl text-[14px] font-bold shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer active:scale-95"
        >
          {saveStatus === "saving"
            ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            : <Save className="w-5 h-5" />}
          {saveStatus === "idle" ? (props.isExistingCv ? "Lưu thay đổi" : "Tạo & Lưu CV") : saveLabels[saveStatus]}
        </button>
        <span className="sr-only" role="status" aria-live="polite">{saveAnnouncements[saveStatus]}</span>
      </div>
    </div>
  );
}

function AppearanceCard() {
  const { cvData, setCvData } = useCvContext();
  const activeTemplate = cvData.template || "chuan";

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] p-5">
      <div className="flex items-center gap-2 mb-4 px-1">
        <Palette className="w-4 h-4 text-violet-600" />
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Mẫu giao diện</h2>
      </div>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 2xl:flex 2xl:flex-col" role="radiogroup" aria-label="Chọn mẫu giao diện CV">
        {TEMPLATE_OPTIONS.map(({ id, name, desc, icon: Icon }) => {
          const active = activeTemplate === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCvData((p) => ({ ...p, template: id }))}
              className={`group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-300 cursor-pointer bg-white ${active
                ? "border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 z-10"
                : "border-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm"
                }`}
            >
              <div className={`p-2 rounded-lg shrink-0 transition-colors ${active ? "bg-slate-100 text-slate-800" : "bg-slate-50 text-slate-500 group-hover:bg-slate-100 group-hover:text-slate-600"}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="font-extrabold text-slate-800 text-[13px] leading-tight group-hover:text-slate-900 transition-colors">{name}</p>
                  {active && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-white leading-none shrink-0 scale-90 font-mono">
                      Đang dùng
                    </span>
                  )}
                </div>
                <p className="text-slate-500 text-[10px] truncate mt-0.5 font-medium">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-slate-100 my-4"></div>

      <div className="px-1">
        <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Màu sắc chủ đạo</h2>
        <div className="flex flex-wrap gap-2 items-center" role="group" aria-label="Chọn màu chủ đạo của CV">
          {ACCENT_COLORS.map((c) => {
            const active = cvData.color === c.hex;
            return (
              <button
                key={c.hex}
                type="button"
                aria-label={`Chọn màu ${c.name}`}
                aria-pressed={active}
                onClick={() => setCvData((p) => ({ ...p, color: c.hex }))}
                className={`relative w-6 h-6 rounded-full cursor-pointer transition-all duration-300 ${active ? "-translate-y-1 scale-110" : "hover:-translate-y-0.5 hover:shadow-md"}`}
                style={{
                  backgroundColor: c.hex,
                  boxShadow: active ? `0 0 0 2px #fff, 0 0 0 4px ${c.hex}, 0 6px 12px rgba(0,0,0,0.15)` : "none",
                }}
                title={c.name}
              >
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-bold leading-none">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function EditorSidebar(props: Props) {
  return (
    <aside className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] 2xl:sticky 2xl:top-3 2xl:flex 2xl:max-h-[calc(100vh-24px)] 2xl:w-[240px] 2xl:flex-col 2xl:overflow-y-auto">
      <ToolsCard {...props} />
      <AppearanceCard />
    </aside>
  );
}
