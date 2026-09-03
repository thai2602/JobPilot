import { apiRequest, buildApiUrl } from "./httpClient";

export interface RecommendationCompany {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  size?: string;
  description?: string;
  culture?: string;
  benefits?: string;
}

export interface JobRecommendation {
  jobId: number;
  slug: string;
  title: string;
  jobType?: string;
  jobLevel?: string;
  experienceYears?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  locationCity?: string;
  locationAddress?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
  company?: RecommendationCompany;
  matchScore: number;
  matchedSkills: string[];
  reasons: string[];
}

export interface JobRecommendationResult {
  cvId: number;
  evaluatedJobs: number;
  generatedAt: string;
  recommendations: JobRecommendation[];
}

export interface JobRecommendationParams {
  cvId: number;
  limit?: number;
}

export interface JobContextParams {
  keywords?: string;
  location?: string;
  jobLevel?: string;
  limit?: number;
}

export interface JobContext {
  jobId: number;
  slug: string;
  title: string;
  companyName?: string;
  companySlug?: string;
  companyDescription?: string;
  companyCulture?: string;
  jobType?: string;
  jobLevel?: string;
  experienceYears?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: string;
  locationCity?: string;
  description?: string;
  requirements?: string;
  benefits?: string;
}

const pathWithQuery = (path: string, query: object) => {
  const url = new URL(buildApiUrl(path, query));
  return `${url.pathname}${url.search}`;
};

export const recommendationsApi = {
  forCv({ cvId, limit = 10 }: JobRecommendationParams): Promise<JobRecommendationResult> {
    return apiRequest<JobRecommendationResult>(
      pathWithQuery("/api/recommendations/jobs", { cvId, limit }),
    );
  },

  searchContext(params: JobContextParams = {}): Promise<JobContext[]> {
    return apiRequest<JobContext[]>(
      pathWithQuery("/api/recommendations/context", params),
    );
  },
};
