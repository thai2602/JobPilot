import { useEffect, useState } from "react";
import { applicationsApi, type ApiApplication } from "../../services/applicationsApi";
import { companiesApi } from "../../services/companiesApi";
import { jobsApi } from "../../services/jobsApi";
import { recommendationsApi } from "../../services/recommendationsApi";
import { readAuthUser } from "../../utils/auth";
import { getActiveCvId } from "../../utils/cv";
import {
   RECOMMENDATION_GROUP,
   buildIndustryGroups,
   buildJobDistribution,
   buildMarketStats,
   buildRecruitmentTrend,
   buildSalaryByPosition,
   mapRecommendation,
   pickFeaturedCompanies,
   type DistributionPoint,
   type HomeCompany,
   type HomeIndustry,
   type MarketStat,
   type RecruitmentTrendPoint,
   type SalaryPoint,
} from "./homeData";

const FETCH_LIMIT = 100;

/** loading → chưa có kết quả; error → API lỗi; ready → đã có dữ liệu thật (có thể rỗng). */
export type SectionStatus = "loading" | "ready" | "error";

export type HomeData = {
   jobsStatus: SectionStatus;
   companiesStatus: SectionStatus;
   marketStats: MarketStat[];
   recruitmentTrend: RecruitmentTrendPoint[];
   jobDistribution: DistributionPoint[];
   salaryByPosition: SalaryPoint[];
   featuredCompanies: HomeCompany[];
   topIndustries: HomeIndustry[];
   /** Id các job người dùng đã ứng tuyển theo server */
   serverAppliedJobIds: number[];
};

const initialData: HomeData = {
   jobsStatus: "loading",
   companiesStatus: "loading",
   marketStats: buildMarketStats(null, null, FETCH_LIMIT),
   recruitmentTrend: [],
   jobDistribution: [],
   salaryByPosition: [],
   featuredCompanies: [],
   topIndustries: [],
   serverAppliedJobIds: [],
};

/** Tải song song việc làm, công ty, gợi ý theo CV và đơn đã ứng tuyển cho trang chủ. */
export function useHomeData(): HomeData {
   const [data, setData] = useState<HomeData>(initialData);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         const authUser = readAuthUser();
         const cvId = getActiveCvId();
         const [jobsResult, companiesResult, recommendationsResult, applicationsResult] = await Promise.allSettled([
            jobsApi.list({ offset: 0, limit: FETCH_LIMIT }),
            companiesApi.list({ offset: 0, limit: FETCH_LIMIT, completeOnly: true }),
            authUser && cvId ? recommendationsApi.forCv({ cvId, limit: 3 }) : Promise.resolve(null),
            authUser ? applicationsApi.listMine() : Promise.resolve<ApiApplication[] | null>(null),
         ]);
         if (cancelled) return;

         const jobs = jobsResult.status === "fulfilled" ? jobsResult.value : null;
         const companies = companiesResult.status === "fulfilled" ? companiesResult.value : null;
         if (!jobs) console.warn("Không tải được việc làm cho trang chủ.", jobsResult.status === "rejected" ? jobsResult.reason : undefined);
         if (!companies) console.warn("Không tải được công ty cho trang chủ.", companiesResult.status === "rejected" ? companiesResult.reason : undefined);

         const recommended = recommendationsResult.status === "fulfilled"
            ? recommendationsResult.value?.recommendations ?? []
            : [];
         const recommendationGroup: HomeIndustry[] = recommended.length
            ? [{ industry: RECOMMENDATION_GROUP, color: "#059669", jobs: recommended.map(mapRecommendation) }]
            : [];

         setData({
            jobsStatus: jobs ? "ready" : "error",
            companiesStatus: companies ? "ready" : "error",
            marketStats: buildMarketStats(jobs, companies, FETCH_LIMIT),
            recruitmentTrend: jobs ? buildRecruitmentTrend(jobs) : [],
            jobDistribution: jobs ? buildJobDistribution(jobs) : [],
            salaryByPosition: jobs ? buildSalaryByPosition(jobs) : [],
            featuredCompanies: companies ? pickFeaturedCompanies(companies) : [],
            topIndustries: [...recommendationGroup, ...(jobs ? buildIndustryGroups(jobs) : [])]
               .filter((group) => group.jobs.length > 0)
               .slice(0, 3),
            serverAppliedJobIds: applicationsResult.status === "fulfilled"
               ? (applicationsResult.value ?? []).map((application) => application.job?.id).filter((id): id is number => Boolean(id))
               : [],
         });
      };

      void load();
      return () => {
         cancelled = true;
      };
   }, []);

   return data;
}
