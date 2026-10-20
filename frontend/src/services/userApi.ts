import { apiRequest } from "./httpClient";

export interface CurrentUserResult {
  userId: number;
  email: string;
}

export const userApi = {
  /** The logged-in user, resolved by the backend from the JWT. */
  getMe(): Promise<CurrentUserResult> {
    return apiRequest<CurrentUserResult>("/api/users/me");
  },
};
