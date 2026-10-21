import Link from "next/link";
import { ArrowRight, MapPin, Users } from "lucide-react";
import type { HomeCompany } from "../homeData";
import type { SectionStatus } from "../useHomeData";
import SectionPlaceholder from "./SectionPlaceholder";

function CompanyCard({ company }: { company: HomeCompany }) {
   return (
      <Link
         href={company.slug ? `/cong-ty/${company.slug}` : "/cong-ty"}
         className="group relative overflow-hidden rounded-[20px] border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      >
         <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-transparent border border-slate-100">
               {company.avatar ? (
                  <img src={company.avatar} alt={company.name} className="h-full w-full object-cover" />
               ) : (
                  <span className="font-bold" style={{ color: company.color }}>{company.initial}</span>
               )}
            </div>
            <div className="flex-1">
               <h3 className="font-bold text-gray-900">{company.name}</h3>
               <p className="mt-1 text-xs text-slate-700">{company.category}</p>
            </div>
         </div>
         <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center gap-2">
               <MapPin className="h-3.5 w-3.5 text-gray-400" />
               <span className="text-xs">{company.location}</span>
            </div>
            <div className="flex items-center gap-2">
               <Users className="h-3.5 w-3.5 text-gray-400" />
               <span className="text-xs">{company.employees}</span>
            </div>
         </div>
         <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2">
            <p className="text-xs font-semibold text-emerald-700">{company.openJobs} việc mở</p>
         </div>
      </Link>
   );
}

export default function FeaturedCompanies({ status, companies }: { status: SectionStatus; companies: HomeCompany[] }) {
   return (
      <section className="space-y-6">
         <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
               Doanh nghiệp uy tín, chất lượng
            </h2>
            <Link href="/cong-ty" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex-shrink-0">
               Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
         </div>

         {companies.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
               {companies.map((company) => (
                  <CompanyCard key={company.slug ?? company.name} company={company} />
               ))}
            </div>
         ) : (
            <SectionPlaceholder status={status} />
         )}
      </section>
   );
}
