import { apiRequest } from "./httpClient";

export interface UserLookupResult {
  userId: number;
  email: string;
}

export const userApi = {
  getByEmail(email: string): Promise<UserLookupResult> {
    return apiRequest<UserLookupResult>(`/api/users/by-email?email=${encodeURIComponent(email)}`);
  },
};

