import { useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { jobLevelLabels, jobTypeOptions, locationOptions } from "../jobMapping";
import type { JobFilters } from "../useJobsList";

type Props = {
   filters: JobFilters;
   onChange: (patch: Partial<JobFilters>) => void;
   onClear: () => void;
   hasActiveFilters: boolean;
};

type Option = { value: string; label: string };

function FilterGroup({ title, options, selected, onSelect }: {
   title: string;
   options: Option[];
   selected: string | null;
   onSelect: (value: string | null) => void;
}) {
   return (
      <fieldset className="space-y-2.5">
         <legend className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">{title}</legend>
         {/* Mobile: chip xếp hàng cho gọn; desktop: danh sách dọc */}
         <div className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1.5">
            {options.map(({ value, label }) => {
               const active = selected === value;
               return (
                  <button
                     key={value}
                     type="button"
                     aria-pressed={active}
                     onClick={() => onSelect(active ? null : value)}
                     className={`px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-colors cursor-pointer flex items-center justify-between gap-2 border lg:w-full ${active
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                  >
                     <span>{label}</span>
                     {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                  </button>
               );
            })}
         </div>
      </fieldset>
   );
}

const locationChoices = locationOptions.map((location) => ({ value: location, label: location }));
const levelChoices = Object.entries(jobLevelLabels).map(([value, label]) => ({ value, label }));

export default function JobFiltersPanel({ filters, onChange, onClear, hasActiveFilters }: Props) {
   // Chỉ dùng trên mobile; từ lg trở lên bộ lọc luôn mở
   const [open, setOpen] = useState(false);
   const activeCount = [filters.location, filters.jobType, filters.level].filter(Boolean).length;

   return (
      <aside className="bg-white border border-slate-100 rounded-3xl shadow-sm lg:sticky lg:top-24 z-10">
         <div className="flex items-center justify-between gap-3 p-4 lg:p-6 lg:pb-0">
            <button
               type="button"
               onClick={() => setOpen((value) => !value)}
               aria-expanded={open}
               aria-controls="job-filter-groups"
               className="flex items-center gap-2 text-[15px] font-black text-slate-900 cursor-pointer lg:cursor-default"
            >
               <SlidersHorizontal className="w-4.5 h-4.5 text-slate-500" aria-hidden="true" />
               Bộ lọc
               {activeCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold inline-flex items-center justify-center">
                     {activeCount}
                  </span>
               )}
               <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform lg:hidden ${open ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {hasActiveFilters && (
               <button
                  type="button"
                  onClick={onClear}
                  className="text-[12px] font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-3 py-2 rounded-lg transition-colors cursor-pointer"
               >
                  Xóa tất cả
               </button>
            )}
         </div>

         <div id="job-filter-groups" className={`${open ? "block" : "hidden"} lg:block px-4 pb-5 lg:px-6 lg:pb-6 space-y-5 pt-4`}>
            <FilterGroup
               title="Địa điểm làm việc"
               options={locationChoices}
               selected={filters.location}
               onSelect={(location) => onChange({ location })}
            />
            <FilterGroup
               title="Hình thức làm việc"
               options={jobTypeOptions}
               selected={filters.jobType}
               onSelect={(jobType) => onChange({ jobType })}
            />
            <FilterGroup
               title="Cấp bậc yêu cầu"
               options={levelChoices}
               selected={filters.level}
               onSelect={(level) => onChange({ level })}
            />
         </div>
      </aside>
   );
}
