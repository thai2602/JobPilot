import { apiRequest } from "./httpClient";

export interface RegisterPayload {
   email: string;
   password: string;
}

export interface LoginPayload {
   email: string;
   password: string;
}

export interface GoogleLoginPayload {
   idToken: string;
}

export interface RegisterResult {
   message: string;
}

export interface LoginResult {
   accessToken: string;
   tokenType: string;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
   const text = await apiRequest<string>("/api/auth/register", {
      method: "POST",
      json: payload,
      auth: false,
      responseType: "text",
   });
   return { message: text || "User registered successfully" };
}

export async function loginUser(payload: LoginPayload): Promise<LoginResult> {
   return apiRequest<LoginResult>("/api/auth/login", {
      method: "POST",
      json: payload,
      auth: false,
   });
}

export async function loginWithGoogle(payload: GoogleLoginPayload): Promise<LoginResult> {
   return apiRequest<LoginResult>("/api/auth/google", {
      method: "POST",
      json: payload,
      auth: false,
   });
}
