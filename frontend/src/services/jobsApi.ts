import { apiRequest, buildApiUrl } from "./httpClient";

export interface ApiJobCompany {
  id?: number;
  name?: string;
  slug?: string;
  logoUrl?: string;
  color?: string;
  description?: string;
}

export interface ApiJob {
  id: number;
  company?: ApiJobCompany;
  title: string;
  slug: string;
  industryId?: number;
  industry?: string;
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
  status?: string;
  expiredAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
}

export interface JobListParams {
  offset?: number;
  limit?: number;
  search?: string;
  location?: string;
  jobType?: string;
  jobLevel?: string;
}

const listPath = (params: JobListParams = {}) => {
  const url = new URL(buildApiUrl("/api/jobs", params));
  return `${url.pathname}${url.search}`;
};

export const jobsApi = {
  list(params: JobListParams = {}): Promise<ApiJob[]> {
    return apiRequest<ApiJob[]>(listPath(params), { auth: false });
  },

  getById(id: number): Promise<ApiJob> {
    return apiRequest<ApiJob>(`/api/jobs/${encodeURIComponent(String(id))}`, { auth: false });
  },

  getBySlug(slug: string): Promise<ApiJob> {
    return apiRequest<ApiJob>(`/api/jobs/slug/${encodeURIComponent(slug)}`, { auth: false });
  },

  ping(): Promise<void> {
    return apiRequest<void>(listPath({ offset: 0, limit: 1 }), {
      method: "HEAD",
      auth: false,
      responseType: "void",
    });
  },
};
