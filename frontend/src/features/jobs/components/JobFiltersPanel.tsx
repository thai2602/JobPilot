import { SlidersHorizontal } from "lucide-react";
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
      <div className="space-y-3">
         <h3 className="text-[12px] font-extrabold text-slate-400 uppercase tracking-wider">{title}</h3>
         <div className="flex flex-col gap-1.5">
            {options.map(({ value, label }) => {
               const active = selected === value;
               return (
                  <button
                     key={value}
                     type="button"
                     onClick={() => onSelect(active ? null : value)}
                     className={`w-full px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-all duration-300 cursor-pointer flex items-center justify-between border bg-white ${active
                        ? "border-slate-900 -translate-y-1 shadow-[0_12px_24px_rgba(0,0,0,0.06)] scale-[1.02] border-2 text-slate-900"
                        : "border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5 hover:shadow-sm"
                        }`}
                  >
                     <span>{label}</span>
                     {active && <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />}
                  </button>
               );
            })}
         </div>
      </div>
   );
}

const locationChoices = locationOptions.map((location) => ({ value: location, label: location }));
const levelChoices = Object.entries(jobLevelLabels).map(([value, label]) => ({ value, label }));

export default function JobFiltersPanel({ filters, onChange, onClear, hasActiveFilters }: Props) {
   return (
      <aside className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 lg:sticky lg:top-8 z-10">
         <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-black text-slate-900 flex items-center gap-2">
               <SlidersHorizontal className="w-4.5 h-4.5 text-slate-500" /> Bộ lọc thông minh
            </h2>
            {hasActiveFilters && (
               <button
                  onClick={onClear}
                  className="text-[11.5px] font-extrabold text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/70 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
               >
                  Xóa tất cả
               </button>
            )}
         </div>

         <hr className="border-slate-100" />
         <FilterGroup
            title="Địa điểm làm việc"
            options={locationChoices}
            selected={filters.location}
            onSelect={(location) => onChange({ location })}
         />
         <hr className="border-slate-100" />
         <FilterGroup
            title="Hình thức làm việc"
            options={jobTypeOptions}
            selected={filters.jobType}
            onSelect={(jobType) => onChange({ jobType })}
         />
         <hr className="border-slate-100" />
         <FilterGroup
            title="Cấp bậc yêu cầu"
            options={levelChoices}
            selected={filters.level}
            onSelect={(level) => onChange({ level })}
         />
      </aside>
   );
}
