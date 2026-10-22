import { Search, X } from "lucide-react";

type Props = {
   searchTerm: string;
   onSearchChange: (value: string) => void;
   /** Bấm "Tìm kiếm" / Enter: kết quả đã lọc theo từ khoá khi gõ, nút chỉ đưa người dùng tới danh sách */
   onSubmit: () => void;
};

export default function JobSearchHero({ searchTerm, onSearchChange, onSubmit }: Props) {
   return (
      <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-5 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-10">
         <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />

         <div className="relative max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
               Tìm việc làm phù hợp với bạn
            </h1>
            <p className="text-sm sm:text-[15px] text-slate-600">
               Tìm theo vị trí, công ty hoặc kỹ năng, rồi thu hẹp bằng bộ lọc.
            </p>

            <form
               role="search"
               onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit();
               }}
               className="flex flex-col sm:flex-row gap-2 sm:gap-3 bg-white border border-slate-200 p-2 sm:p-2.5 rounded-2xl shadow-md focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all"
            >
               <div className="flex-1 flex items-center gap-3 px-3">
                  <Search className="w-5 h-5 text-slate-500 shrink-0" aria-hidden="true" />
                  <input
                     type="search"
                     aria-label="Tìm việc làm"
                     placeholder="Vị trí, công ty hoặc kỹ năng..."
                     value={searchTerm}
                     onChange={(e) => onSearchChange(e.target.value)}
                     className="bg-transparent border-none outline-none text-slate-900 text-[14.5px] w-full py-2 placeholder:text-slate-500 font-medium"
                  />
                  {searchTerm && (
                     <button
                        type="button"
                        onClick={() => onSearchChange("")}
                        aria-label="Xoá từ khoá"
                        className="p-1.5 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                     >
                        <X className="w-4 h-4" />
                     </button>
                  )}
               </div>
               <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[14px] rounded-xl transition-colors shadow-sm cursor-pointer shrink-0"
               >
                  Tìm kiếm
               </button>
            </form>
         </div>
      </section>
   );
}
