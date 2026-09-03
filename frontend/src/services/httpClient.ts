import { API_URL } from "../config/env";
import { clearAuthUser } from "../utils/auth";

export type ApiResponseType = "auto" | "json" | "text" | "void";

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: BodyInit | null;
  json?: unknown;
  responseType?: ApiResponseType;
}

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const extractErrorMessage = (raw: string, fallback: string): { message: string; details: unknown } => {
  if (!raw.trim()) return { message: fallback, details: undefined };

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "string" && parsed.trim()) return { message: parsed, details: parsed };
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as { message?: unknown; detail?: unknown; error?: unknown };
      if (typeof candidate.message === "string" && candidate.message.trim()) {
        return { message: candidate.message, details: parsed };
      }
      if (typeof candidate.detail === "string" && candidate.detail.trim()) {
        return { message: candidate.detail, details: parsed };
      }
      if (typeof candidate.error === "string" && candidate.error.trim()) {
        return { message: candidate.error, details: parsed };
      }
    }
    return { message: fallback, details: parsed };
  } catch {
    return { message: raw, details: raw };
  }
};

export const buildApiUrl = <TQuery extends object = Record<string, never>>(
  path: string,
  query?: TQuery,
) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const normalizedBaseUrl = API_URL.replace(/\/+$/, "");
  const url = new URL(`${normalizedBaseUrl}${normalizedPath}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export async function apiRequest<T = void>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    auth = true,
    json,
    responseType = "auto",
    headers: suppliedHeaders,
    ...requestOptions
  } = options;
  const headers = new Headers(suppliedHeaders);
  const token = auth ? getAccessToken() : null;

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (json !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(buildApiUrl(path), {
      ...requestOptions,
      headers,
      body: json !== undefined ? JSON.stringify(json) : requestOptions.body,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      `Không thể kết nối backend tại ${API_URL}. Hãy kiểm tra kết nối và thử lại.`,
      0,
      error,
    );
  }

  const raw = response.status === 204 ? "" : await response.text();
  if (!response.ok) {
    if (auth && token && response.status === 401) {
      clearAuthUser();
    }
    const fallback = `Yêu cầu thất bại (${response.status}).`;
    const { message, details } = extractErrorMessage(raw, fallback);
    throw new ApiError(message, response.status, details);
  }

  if (responseType === "void" || response.status === 204) return undefined as T;
  if (responseType === "text") return raw as T;
  if (!raw) return undefined as T;

  if (responseType === "json" || response.headers.get("content-type")?.includes("application/json")) {
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      throw new ApiError("Backend trả về dữ liệu JSON không hợp lệ.", response.status, {
        raw,
        cause: error,
      });
    }
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}
