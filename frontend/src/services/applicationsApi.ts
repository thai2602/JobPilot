import { apiRequest } from "./httpClient";
import type { ApiJob } from "./jobsApi";

export interface ApiApplication {
  id: number;
  job: ApiJob;
  cvId?: number;
  status?: string;
  trackingNote?: string;
  appliedAt?: string;
}

export interface CreateApplicationPayload {
  jobId: number;
  cvId: number;
}

export const applicationsApi = {
  listMine(): Promise<ApiApplication[]> {
    return apiRequest<ApiApplication[]>("/api/applications");
  },

  create(payload: CreateApplicationPayload): Promise<ApiApplication> {
    return apiRequest<ApiApplication>("/api/applications", {
      method: "POST",
      json: payload,
    });
  },

  remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/api/applications/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      responseType: "void",
    });
  },
};
