import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, Trash2 } from "lucide-react";
import { useCvContext, type CvData } from "../CvContext";

export const inputCls = "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[13.5px] font-medium text-slate-900 outline-none transition-all focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 focus:bg-white placeholder:text-slate-400";
export const labelCls = "block text-[12.5px] font-bold text-slate-700 mb-1.5";
export const itemLabelCls = "block text-[12px] font-bold text-slate-500 uppercase";
const addBtnCls = "px-3.5 py-2 text-[12.5px] font-bold text-violet-700 bg-violet-50 rounded-xl hover:bg-violet-100 hover:scale-105 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95";
const removeBtnCls = "absolute top-3 right-3 p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer";
const cardCls = "border border-slate-100 rounded-[16px] p-4 bg-white shadow-sm relative group hover:border-violet-200 transition-colors";

/** Textarea tự giãn chiều cao theo nội dung. */
export function AutoGrowTextarea({ onValueChange, className, ...props }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> & {
  onValueChange: (value: string) => void;
}) {
  return (
    <textarea
      {...props}
      className={`${inputCls} resize-none leading-relaxed overflow-hidden ${className ?? ""}`}
      onChange={(e) => {
        onValueChange(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
    />
  );
}

type ListKey = "skills" | "experiences" | "educations" | "projects" | "attachments" | "socials";
type ItemOf<K extends ListKey> = CvData[K][number];

/** Thêm / sửa / xoá phần tử của một mục dạng danh sách trong CV. */
export function useCvList<K extends ListKey>(key: K, blank: () => ItemOf<K>) {
  const { cvData, setCvData } = useCvContext();
  const items = (cvData[key] || []) as ItemOf<K>[];
  const replace = (next: ItemOf<K>[]) => ({ [key]: next }) as Partial<CvData>;

  return {
    items,
    add: () => setCvData((p) => ({ ...p, ...replace([...((p[key] || []) as ItemOf<K>[]), blank()]) })),
    update: <F extends keyof ItemOf<K>>(index: number, field: F, value: ItemOf<K>[F]) =>
      setCvData((p) => {
        const next = [...((p[key] || []) as ItemOf<K>[])];
        next[index] = { ...next[index], [field]: value };
        return { ...p, ...replace(next) };
      }),
    remove: (index: number) =>
      setCvData((p) => ({ ...p, ...replace(((p[key] || []) as ItemOf<K>[]).filter((_, j) => j !== index)) })),
  };
}

/** Khung chung cho một mục dạng danh sách: tiêu đề, nút thêm, các thẻ, và trạng thái trống. */
export function ListSection<T>({ icon: Icon, iconClass, title, addLabel, emptyText, items, onAdd, onRemove, layout = "stack", renderItem }: {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  addLabel: string;
  emptyText: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  layout?: "stack" | "grid";
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const empty = (
    <div className="text-center py-10 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-[14px] font-medium">
      {emptyText}
    </div>
  );

  return (
    <section className="mb-10 group">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-transparent border rounded-[14px] transition-colors ${iconClass}`}><Icon className="w-5 h-5" /></div>
          <h2 className="text-xl font-extrabold text-slate-800">{title}</h2>
        </div>
        <button type="button" className={addBtnCls} onClick={onAdd}>
          <Plus className="w-4 h-4" /> {addLabel}
        </button>
      </div>

      <div className={layout === "grid" ? "grid grid-cols-1 sm:grid-cols-2 gap-4" : "flex flex-col gap-4"}>
        {items.map((item, index) => (
          // Các mục không có id ổn định; dùng index như bản cũ
          <div key={index} className={cardCls}>
            <button type="button" className={removeBtnCls} onClick={() => onRemove(index)} title="Xóa">
              <Trash2 className="w-4 h-4" />
            </button>
            {renderItem(item, index)}
          </div>
        ))}
        {layout === "stack" && items.length === 0 && empty}
      </div>
      {layout === "grid" && items.length === 0 && empty}
    </section>
  );
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className={itemLabelCls}>{label}</label>
      {children}
    </div>
  );
}
