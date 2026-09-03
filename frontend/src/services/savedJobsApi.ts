import { apiRequest } from "./httpClient";
import type { ApiJob } from "./jobsApi";

export interface ApiSavedJob {
  id: number;
  job: ApiJob;
  savedAt?: string;
}

export const savedJobsApi = {
  listMine(): Promise<ApiSavedJob[]> {
    return apiRequest<ApiSavedJob[]>("/api/saved-jobs");
  },

  create(jobId: number): Promise<ApiSavedJob> {
    return apiRequest<ApiSavedJob>("/api/saved-jobs", {
      method: "POST",
      json: { jobId },
    });
  },

  remove(id: number | string): Promise<void> {
    return apiRequest<void>(`/api/saved-jobs/${encodeURIComponent(String(id))}`, {
      method: "DELETE",
      responseType: "void",
    });
  },
};
