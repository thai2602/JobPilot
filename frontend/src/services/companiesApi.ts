import { apiRequest, buildApiUrl } from "./httpClient";
import type { ApiJob } from "./jobsApi";

export interface ApiCompany {
  id: number;
  employerId?: number;
  name: string;
  slug: string;
  logoUrl?: string;
  color?: string;
  website?: string;
  taxCode?: string;
  industryId?: number;
  industry?: string;
  headquarters?: string;
  size?: string;
  description?: string;
  culture?: string;
  benefits?: string;
  isFeatured?: boolean;
  createdAt?: string;
  updatedAt?: string;
  isDeleted?: boolean;
  positions?: ApiJob[];
}

export interface CompanyListParams {
  offset?: number;
  limit?: number;
  search?: string;
  completeOnly?: boolean;
}

const listPath = (params: CompanyListParams = {}) => {
  const url = new URL(buildApiUrl("/api/companies", params));
  return `${url.pathname}${url.search}`;
};

export const companiesApi = {
  list(params: CompanyListParams = {}): Promise<ApiCompany[]> {
    return apiRequest<ApiCompany[]>(listPath(params), { auth: false });
  },

  getBySlug(slug: string): Promise<ApiCompany> {
    return apiRequest<ApiCompany>(`/api/companies/${encodeURIComponent(slug)}`, { auth: false });
  },
};
