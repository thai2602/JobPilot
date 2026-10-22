import { useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { CompanyDirectoryResponse, CompanyFacetOption } from "../../../services/companiesApi";
import type { CompanyFilters } from "../useCompanyDirectory";

type Facets = CompanyDirectoryResponse["facets"];

type Props = {
   filters: CompanyFilters;
   facets: Facets | null;
   onChange: (patch: Partial<CompanyFilters>) => void;
   onClear: () => void;
   activeCount: number;
};

const INDUSTRY_PREVIEW = 8;

function OptionButton({ option, active, onSelect }: { option: CompanyFacetOption; active: boolean; onSelect: () => void }) {
   // Lựa chọn không còn kết quả vẫn hiện (để người dùng thấy) nhưng không bấm được, trừ khi đang chọn
   const empty = option.count === 0 && !active;
   return (
      <button
         type="button"
         aria-pressed={active}
         disabled={empty}
         onClick={onSelect}
         className={`px-3.5 py-2.5 rounded-xl text-[13px] font-bold text-left transition-colors flex items-center justify-between gap-2 border lg:w-full ${active
            ? "border-emerald-600 bg-emerald-50 text-emerald-800"
            : empty
               ? "border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed"
               : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
            }`}
      >
         <span className="min-w-0 truncate">{option.label}</span>
         <span className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[12px] font-semibold tabular-nums ${active ? "text-emerald-800" : "text-slate-500"}`}>{option.count}</span>
            {active && <Check className="w-4 h-4" aria-hidden="true" />}
         </span>
      </button>
   );
}

function FilterGroup({ title, options, selected, onSelect, children }: {
   title: string;
   options: CompanyFacetOption[];
   selected: string | null;
   onSelect: (value: string | null) => void;
   children?: React.ReactNode;
}) {
   return (
      <fieldset>
         <legend className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">{title}</legend>
         {/* Mobile: chip xếp hàng cho gọn; desktop: danh sách dọc */}
         <div className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1.5">
            {options.map((option) => (
               <OptionButton
                  key={option.value}
                  option={option}
                  active={selected === option.value}
                  onSelect={() => onSelect(selected === option.value ? null : option.value)}
               />
            ))}
         </div>
         {children}
      </fieldset>
   );
}

export default function CompanyFiltersPanel({ filters, facets, onChange, onClear, activeCount }: Props) {
   // Chỉ dùng trên mobile; từ lg trở lên bộ lọc luôn mở
   const [open, setOpen] = useState(false);
   const [showAllIndustries, setShowAllIndustries] = useState(false);

   const industries = facets?.industries ?? [];
   // Ngành đang chọn có thể không còn trong danh sách đếm (0 kết quả với bộ lọc khác): vẫn giữ để bỏ chọn được
   const industryOptions = filters.industry && !industries.some((item) => item.value === filters.industry)
      ? [{ value: filters.industry, label: filters.industry, count: 0 }, ...industries]
      : industries;
   const visibleIndustries = showAllIndustries
      ? industryOptions
      : industryOptions.filter((item, index) => index < INDUSTRY_PREVIEW || item.value === filters.industry);
   const hiddenIndustryCount = industryOptions.length - visibleIndustries.length;

   return (
      <aside className="bg-white border border-slate-100 rounded-3xl shadow-sm lg:sticky lg:top-24">
         <div className="flex items-center justify-between gap-3 p-4 lg:p-6 lg:pb-0">
            <button
               type="button"
               onClick={() => setOpen((value) => !value)}
               aria-expanded={open}
               aria-controls="company-filter-groups"
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
            {activeCount > 0 && (
               <button
                  type="button"
                  onClick={onClear}
                  className="text-[12px] font-extrabold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/70 px-3 py-2 rounded-lg transition-colors cursor-pointer"
               >
                  Xóa tất cả
               </button>
            )}
         </div>

         <div id="company-filter-groups" className={`${open ? "block" : "hidden"} lg:block px-4 pb-5 lg:px-6 lg:pb-6 space-y-6 pt-4`}>
            <label className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors ${filters.hiring
               ? "border-emerald-600 bg-emerald-50"
               : facets?.hiring
                  ? "border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                  : "border-slate-100 bg-slate-50 cursor-not-allowed"
               }`}>
               <input
                  type="checkbox"
                  checked={filters.hiring}
                  disabled={!filters.hiring && !facets?.hiring}
                  onChange={(event) => onChange({ hiring: event.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-emerald-700"
               />
               <span className="min-w-0">
                  <span className="block text-[13px] font-bold text-slate-800">Chỉ công ty đang tuyển</span>
                  <span className="block text-[12px] text-slate-500 mt-0.5">
                     {facets?.hiring ? `${facets.hiring} công ty có tin còn hạn` : "Hiện chưa có công ty nào có tin còn hạn"}
                  </span>
               </span>
            </label>

            <FilterGroup
               title="Có văn phòng tại"
               options={facets?.regions ?? []}
               selected={filters.region}
               onSelect={(region) => onChange({ region: region as CompanyFilters["region"] })}
            />

            <FilterGroup
               title="Quy mô"
               options={facets?.sizes ?? []}
               selected={filters.size}
               onSelect={(size) => onChange({ size: size as CompanyFilters["size"] })}
            />

            <FilterGroup
               title="Lĩnh vực"
               options={visibleIndustries}
               selected={filters.industry}
               onSelect={(industry) => onChange({ industry })}
            >
               {(hiddenIndustryCount > 0 || showAllIndustries) && (
                  <button
                     type="button"
                     onClick={() => setShowAllIndustries((value) => !value)}
                     aria-expanded={showAllIndustries}
                     className="mt-2.5 text-[13px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                  >
                     {showAllIndustries ? "Thu gọn" : `Xem thêm ${hiddenIndustryCount} lĩnh vực`}
                  </button>
               )}
            </FilterGroup>
         </div>
      </aside>
   );
}
