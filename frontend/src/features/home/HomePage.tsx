'use client';

import ApplyCvModal from "../../components/ApplyCvModal";
import FeaturedCompanies from "./components/FeaturedCompanies";
import HomeBanner from "./components/HomeBanner";
import { QuickLinks, SignUpCta, WhyJobPilot } from "./components/HomeInfoSections";
import RecruitmentCharts from "./components/RecruitmentCharts";
import TopIndustryJobs from "./components/TopIndustryJobs";
import { useHomeApplications } from "./useHomeApplications";
import { useHomeData } from "./useHomeData";

export default function HomePage() {
   const data = useHomeData();
   const applications = useHomeApplications(data.serverAppliedJobIds);
   const { toast } = applications;

   return (
      <div className="space-y-12">
         <HomeBanner stats={data.marketStats} />
         <RecruitmentCharts
            status={data.jobsStatus}
            trend={data.recruitmentTrend}
            distribution={data.jobDistribution}
            salaryByPosition={data.salaryByPosition}
         />
         <FeaturedCompanies status={data.companiesStatus} companies={data.featuredCompanies} />
         <WhyJobPilot />
         <TopIndustryJobs
            status={data.jobsStatus}
            industries={data.topIndustries}
            isApplied={applications.isApplied}
            onApply={applications.startApplication}
         />
         <SignUpCta />
         <QuickLinks />

         {toast && (
            <div style={{ position: "fixed", left: "50%", top: 24, transform: "translateX(-50%)", zIndex: 1300, minWidth: "min(520px, calc(100vw - 24px))" }}>
               <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", borderRadius: 14, border: `1px solid ${toast.kind === "success" ? "#86efac" : "#fca5a5"}`, background: toast.kind === "success" ? "linear-gradient(135deg, #f0fdf4, #ffffff)" : "linear-gradient(135deg, #fff1f2, #ffffff)", boxShadow: "0 18px 50px rgba(15,23,42,0.16)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                     <div style={{ width: 10, height: 10, borderRadius: 999, background: toast.kind === "success" ? "#16a34a" : "#dc2626", flexShrink: 0 }} />
                     <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{toast.message}</p>
                  </div>
                  <button onClick={applications.dismissToast} style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer", fontWeight: 700 }}>×</button>
               </div>
            </div>
         )}

         <ApplyCvModal
            isOpen={applications.applyingJob !== null}
            onClose={applications.cancelApplication}
            onConfirm={applications.confirmApplication}
         />
      </div>
   );
}
