export interface AuthUser {
   name: string;
   email: string;
   avatarDataUrl?: string;
   phone?: string;
   hometown?: string;
   gender?: "Nam" | "Nữ" | "Khác";
   age?: number;
   authProvider?: "LOCAL" | "GOOGLE";
   createdAt?: string;
   lastLoginAt?: string;
   profileUpdatedAt?: string;
}

export interface AuthSessionInfo {
   hasToken: boolean;
   isValid: boolean;
   isExpired: boolean;
   expiresAt?: Date;
   issuedAt?: Date;
   userId?: string;
}

const AUTH_USER_STORAGE_KEY = "jobpilot.auth.user";
const AUTH_USER_CHANGE_EVENT = "jobpilot:auth-user-changed";
const ACCESS_TOKEN_STORAGE_KEY = "accessToken";
const ACCOUNT_PROFILE_STORAGE_PREFIX = "jobpilot.account.profile.";

type StoredAccountProfile = Pick<AuthUser,
   "name" | "avatarDataUrl" | "phone" | "hometown" | "gender" | "age" | "createdAt" | "profileUpdatedAt"
>;

const getProfileStorageKey = (email: string) =>
   `${ACCOUNT_PROFILE_STORAGE_PREFIX}${email.trim().toLowerCase()}`;

const optionalString = (value: unknown) =>
   typeof value === "string" && value.trim() ? value.trim() : undefined;

const sanitizeAuthUser = (value: unknown): AuthUser | null => {
   if (!value || typeof value !== "object") return null;
   const raw = value as Record<string, unknown>;
   const name = optionalString(raw.name);
   const email = optionalString(raw.email)?.toLowerCase();
   if (!name || !email) return null;

   const gender = raw.gender === "Nam" || raw.gender === "Nữ" || raw.gender === "Khác"
      ? raw.gender
      : undefined;
   const authProvider = raw.authProvider === "LOCAL" || raw.authProvider === "GOOGLE"
      ? raw.authProvider
      : undefined;
   const age = typeof raw.age === "number" && Number.isInteger(raw.age) ? raw.age : undefined;

   return {
      name,
      email,
      avatarDataUrl: optionalString(raw.avatarDataUrl),
      phone: optionalString(raw.phone),
      hometown: optionalString(raw.hometown),
      gender,
      age,
      authProvider,
      createdAt: optionalString(raw.createdAt),
      lastLoginAt: optionalString(raw.lastLoginAt),
      profileUpdatedAt: optionalString(raw.profileUpdatedAt),
   };
};

export function readAccountProfile(email: string): StoredAccountProfile | null {
   if (typeof window === "undefined") return null;
   try {
      const raw = localStorage.getItem(getProfileStorageKey(email));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredAccountProfile;
      return parsed?.name ? parsed : null;
   } catch {
      return null;
   }
}

export function saveAccountProfile(email: string, profile: StoredAccountProfile) {
   if (typeof window === "undefined") return;
   const existing = readAccountProfile(email);
   localStorage.setItem(getProfileStorageKey(email), JSON.stringify({ ...existing, ...profile }));
}

function emitAuthUserChanged() {
   if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(AUTH_USER_CHANGE_EVENT));
   }
}

export function readAuthUser(): AuthUser | null {
   if (typeof window === "undefined") {
      return null;
   }
   try {
      const raw = localStorage.getItem(AUTH_USER_STORAGE_KEY);

      if (!raw) {
         return null;
      }

      const parsed = sanitizeAuthUser(JSON.parse(raw));
      if (!parsed) {
         return null;
      }

      const session = readAuthSessionInfo();
      if (!session.hasToken || !session.isValid || session.isExpired) {
         return null;
      }

      return parsed;
   } catch {
      return null;
   }
}

export function hasStoredAuthUser(): boolean {
   if (typeof window === "undefined") return false;
   return Boolean(localStorage.getItem(AUTH_USER_STORAGE_KEY));
}

export function removeLegacyAuthFields() {
   if (typeof window === "undefined") return;
   const user = readAuthUser();
   if (user) localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
}

export function setAuthUser(user: AuthUser) {
   if (typeof window !== "undefined") {
      const sanitizedUser = sanitizeAuthUser(user);
      if (!sanitizedUser) throw new Error("Dữ liệu người dùng không hợp lệ.");
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(sanitizedUser));
      saveAccountProfile(sanitizedUser.email, {
         name: sanitizedUser.name,
         avatarDataUrl: sanitizedUser.avatarDataUrl,
         phone: sanitizedUser.phone,
         hometown: sanitizedUser.hometown,
         gender: sanitizedUser.gender,
         age: sanitizedUser.age,
         createdAt: sanitizedUser.createdAt,
         profileUpdatedAt: sanitizedUser.profileUpdatedAt,
      });
      emitAuthUserChanged();
   }
}

export function setAuthSession(user: AuthUser, accessToken: string) {
   if (typeof window === "undefined") return;
   const normalizedToken = accessToken?.trim();
   if (!normalizedToken) {
      throw new Error("Backend không trả về access token hợp lệ.");
   }
   localStorage.removeItem(AUTH_USER_STORAGE_KEY);
   localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalizedToken);
   const session = readAuthSessionInfo();
   if (!session.isValid || session.isExpired) {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      throw new Error("Phiên đăng nhập backend trả về không hợp lệ hoặc đã hết hạn.");
   }
   const storedProfile = readAccountProfile(user.email);
   setAuthUser({
      ...user,
      ...storedProfile,
      email: user.email,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt,
      createdAt: storedProfile?.createdAt ?? user.createdAt,
   });
}

export function readAccessToken(): string | null {
   if (typeof window === "undefined") return null;
   return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function readAuthSessionInfo(): AuthSessionInfo {
   const token = readAccessToken();
   if (!token) return { hasToken: false, isValid: false, isExpired: false };

   try {
      const payloadSegment = token.split(".")[1];
      if (!payloadSegment) return { hasToken: true, isValid: false, isExpired: false };
      const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const payload = JSON.parse(atob(padded)) as { exp?: number; iat?: number; sub?: string | number };
      const expiresAt = payload.exp ? new Date(payload.exp * 1000) : undefined;
      const issuedAt = payload.iat ? new Date(payload.iat * 1000) : undefined;
      const isValid = Boolean(payload.sub !== undefined && expiresAt && !Number.isNaN(expiresAt.getTime()));
      return {
         hasToken: true,
         isValid,
         isExpired: Boolean(expiresAt && expiresAt.getTime() <= Date.now()),
         expiresAt,
         issuedAt,
         userId: payload.sub === undefined ? undefined : String(payload.sub),
      };
   } catch {
      return { hasToken: true, isValid: false, isExpired: false };
   }
}

export function updateAuthUser(fields: Partial<AuthUser>): boolean {
   const current = readAuthUser();
   if (!current) {
      return false;
   }

   setAuthUser({
      ...current,
      ...fields,
   });
   return true;
}

export function clearAuthUser() {
   if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
      localStorage.removeItem("jobpilot.my-cvs");
      localStorage.removeItem("jobpilot_applications");
      localStorage.removeItem("jobpilot_saved_jobs");
      window.dispatchEvent(new Event("jobpilot-data-updated"));
      emitAuthUserChanged();
   }
}

export function subscribeAuthUserChange(onChange: (user: AuthUser | null) => void) {
   if (typeof window === "undefined") {
      return () => {};
   }

   const handler = () => {
      onChange(readAuthUser());
   };
   const storageHandler = (event: StorageEvent) => {
      if (
         event.key === null ||
         event.key === AUTH_USER_STORAGE_KEY ||
         event.key === ACCESS_TOKEN_STORAGE_KEY ||
         event.key?.startsWith(ACCOUNT_PROFILE_STORAGE_PREFIX)
      ) {
         handler();
      }
   };

   window.addEventListener(AUTH_USER_CHANGE_EVENT, handler);
   window.addEventListener("storage", storageHandler);

   return () => {
      window.removeEventListener(AUTH_USER_CHANGE_EVENT, handler);
      window.removeEventListener("storage", storageHandler);
   };
}
