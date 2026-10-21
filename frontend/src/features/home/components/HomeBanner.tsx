import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { MarketStat } from "../homeData";

export default function HomeBanner({ stats }: { stats: MarketStat[] }) {
   return (
      <section className="relative overflow-hidden rounded-[20px] border border-slate-200 bg-white px-6 py-16 shadow-[0_4px_20px_rgba(0,0,0,0.06)] md:px-12 md:py-20 min-h-[400px] md:min-h-[520px]">
         <div className="home-banner-orb home-banner-orb-1" />
         <div className="home-banner-orb home-banner-orb-2" />

         <div className="relative grid gap-6 lg:grid-cols-3 items-center lg:items-center">
            <div className="space-y-6 lg:col-span-3 text-center mx-auto max-w-3xl">
               <div className="space-y-7">
                  <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
                     Ứng tuyển nhanh, việc làm tốt
                  </h1>
                  <p className="text-sm sm:text-base leading-relaxed text-slate-600 max-w-xl mx-auto">
                     JobPilot giúp bạn kết nối với các công ty uy tín, nhận gợi ý việc phù hợp từng ngày, và tối ưu hồ sơ để ứng tuyển hiệu quả.
                  </p>
               </div>

               <div className="flex flex-wrap items-center justify-center gap-3 pt-5">
                  <Link href="/tim-viec" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                     Khám phá việc làm <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/dang-ky" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:shadow-md transition-all hover:border-slate-400">
                     Tạo tài khoản miễn phí
                  </Link>
               </div>

               <div className="pt-4 grid grid-cols-3 gap-3 md:gap-4 justify-items-center">
                  {stats.map((stat) => (
                     <div key={stat.label} className="group rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 md:p-4 transition-all hover:shadow-md text-center">
                        <p className="text-xs md:text-[11px] uppercase tracking-widest text-slate-600 font-semibold">{stat.label}</p>
                        <p className="mt-2 text-xl md:text-2xl " style={{ color: stat.accent }}>{stat.value ?? "—"}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>
   );
}
