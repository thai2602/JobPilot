import { apiRequest } from "./httpClient";

export interface CurrentUserResult {
  userId: number;
  email: string;
  authProvider?: string;
  /** Ngày tạo tài khoản theo server (ISO), có thể thiếu với dữ liệu cũ */
  createdAt?: string | null;
}

export const userApi = {
  /** The logged-in user, resolved by the backend from the JWT. */
  getMe(): Promise<CurrentUserResult> {
    return apiRequest<CurrentUserResult>("/api/users/me");
  },
};
