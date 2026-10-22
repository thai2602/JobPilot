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
  /** Tổng số tin đã đăng, kể cả tin đã hết hạn. */
  jobCount?: number;
}

export interface CompanyListParams {
  offset?: number;
  limit?: number;
  search?: string;
  completeOnly?: boolean;
}

export type CompanySizeGroup = "SMALL" | "MEDIUM" | "LARGE";
export type CompanyRegion = "HA_NOI" | "HO_CHI_MINH" | "DA_NANG" | "OTHER";
export type CompanySort = "featured" | "name" | "recent";

export interface CompanyDirectoryParams {
  offset?: number;
  limit?: number;
  search?: string;
  industry?: string;
  size?: CompanySizeGroup;
  region?: CompanyRegion;
  hiring?: boolean;
  sort?: CompanySort;
}

export interface CompanyFacetOption {
  value: string;
  label: string;
  count: number;
}

export interface CompanyDirectoryResponse {
  items: ApiCompany[];
  total: number;
  offset: number;
  limit: number;
  /** Số lượng mỗi lựa chọn, đếm cùng các bộ lọc còn lại. */
  facets: {
    industries: CompanyFacetOption[];
    sizes: CompanyFacetOption[];
    regions: CompanyFacetOption[];
    hiring: number;
  };
}

const apiPath = (path: string, params: object = {}) => {
  const url = new URL(buildApiUrl(path, params));
  return `${url.pathname}${url.search}`;
};

export const companiesApi = {
  list(params: CompanyListParams = {}): Promise<ApiCompany[]> {
    return apiRequest<ApiCompany[]>(apiPath("/api/companies", params), { auth: false });
  },

  directory(params: CompanyDirectoryParams = {}): Promise<CompanyDirectoryResponse> {
    return apiRequest<CompanyDirectoryResponse>(apiPath("/api/companies/directory", params), { auth: false });
  },

  getBySlug(slug: string): Promise<ApiCompany> {
    return apiRequest<ApiCompany>(`/api/companies/${encodeURIComponent(slug)}`, { auth: false });
  },
};
