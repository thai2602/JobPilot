import { Briefcase, Search, X } from "lucide-react";

type Props = {
   searchTerm: string;
   onSearchChange: (value: string) => void;
};

export default function JobSearchHero({ searchTerm, onSearchChange }: Props) {
   return (
      <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
         {/* Decorative orbs */}
         <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl" />
         <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl" />

         <div className="relative max-w-4xl mx-auto text-center space-y-6">
            <div className="flex justify-center mb-4">
               <div className="p-3 rounded-full bg-emerald-100">
                  <Briefcase className="w-8 h-8 text-emerald-600" />
               </div>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
               Khám phá cơ hội nghề nghiệp bứt phá
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 max-w-2xl mx-auto">
               Kết nối trực tiếp cùng các nhà tuyển dụng hàng đầu. Sử dụng bộ lọc thông minh tức thì và ứng tuyển siêu tốc chỉ với một cú click chuột.
            </p>

            <div className="pt-4 max-w-2xl mx-auto w-full">
               <div className="flex flex-col sm:flex-row gap-3 bg-white border border-slate-200 p-3 rounded-2xl shadow-md focus-within:border-emerald-500/60 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="flex-1 flex items-center gap-3 px-4">
                     <Search className="w-5 h-5 text-slate-400 shrink-0" />
                     <input
                        type="text"
                        placeholder="Nhập vị trí, công ty hoặc kỹ năng..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="bg-transparent border-none outline-none text-slate-900 text-[14.5px] w-full placeholder:text-slate-400 font-medium"
                     />
                     {searchTerm && (
                        <button onClick={() => onSearchChange("")} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                           <X className="w-4 h-4" />
                        </button>
                     )}
                  </div>
                  <button className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[14px] rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0">
                     Tìm kiếm
                  </button>
               </div>
            </div>
         </div>
      </section>
   );
}
