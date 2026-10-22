import Link from "next/link";
import { ArrowRight, MapPin, Wallet } from "lucide-react";
import type { HomeIndustry, HomeJob } from "../homeData";
import { applicationKey } from "../useHomeApplications";
import type { SectionStatus } from "../useHomeData";
import SectionPlaceholder from "./SectionPlaceholder";

type ApplyProps = {
   isApplied: (industryName: string, job: HomeJob) => boolean;
   onApply: (industryName: string, job: HomeJob) => void;
};

function TopIndustryCard({ industry, isApplied, onApply }: ApplyProps & { industry: HomeIndustry }) {
   return (
      <div className="rounded-[24px] border border-gray-200/80 bg-white p-6 shadow-sm">
         <div className="flex items-center gap-3 mb-4">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: industry.color }} />
            <h3 className="text-lg font-bold text-gray-900">{industry.industry}</h3>
         </div>
         <div className="space-y-3">
            {industry.jobs.map((job) => {
               const applied = isApplied(industry.industry, job);
               return (
                  <div key={applicationKey(industry.industry, job)} className="rounded-lg border border-gray-100 bg-gray-50/50 p-4">
                     <Link
                        href={job.slug ? `/tim-viec/${job.slug}` : "/tim-viec"}
                        className="font-semibold text-gray-900 text-sm hover:text-emerald-800"
                     >
                        {job.title}
                     </Link>
                     <p className="text-xs text-slate-700 mt-1">{job.company}</p>
                     <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-transparent border border-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                           <MapPin className="h-3 w-3 text-slate-600" />
                           {job.place}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-transparent border border-emerald-100/40 px-3 py-1 text-xs font-semibold text-emerald-700">
                           <Wallet className="h-3 w-3 text-emerald-700" />
                           {job.salary}
                        </span>
                     </div>
                     <div className="flex flex-wrap gap-1 mt-3">
                        {job.tags.map((tag) => (
                           <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] font-medium text-slate-700 border border-gray-200">
                              {tag}
                           </span>
                        ))}
                     </div>
                     <button
                        type="button"
                        onClick={() => onApply(industry.industry, job)}
                        disabled={applied || job.expired}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                     >
                        {applied ? "Đã ứng tuyển" : job.expired ? "Đã hết hạn" : "Ứng tuyển"}
                     </button>
                  </div>
               );
            })}
         </div>
         <Link href="/tim-viec" className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-slate-800 hover:text-slate-900 transition-colors">
            Xem thêm <ArrowRight className="h-4 w-4" />
         </Link>
      </div>
   );
}

export default function TopIndustryJobs({ status, industries, ...applyProps }: ApplyProps & {
   status: SectionStatus;
   industries: HomeIndustry[];
}) {
   return (
      <section className="space-y-6">
         <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
               Cơ hội việc làm top ngành nghề
            </h2>
            <Link href="/tim-viec" className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors flex-shrink-0">
               Xem tất cả <ArrowRight className="h-4 w-4" />
            </Link>
         </div>

         {industries.length ? (
            <div className="grid gap-6 lg:grid-cols-3">
               {industries.map((industry) => (
                  <TopIndustryCard key={industry.industry} industry={industry} {...applyProps} />
               ))}
            </div>
         ) : (
            <SectionPlaceholder status={status} />
         )}
      </section>
   );
}
