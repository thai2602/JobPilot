'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { type FormEvent, useState, useEffect } from "react";
import { clearAuthUser, readAuthUser, setAuthSession, type AuthUser } from "../../utils/auth";
import { loginUser, loginWithGoogle } from "../../services/authApi";
import logoImg from "../../assets/logo/Screenshot_2026-05-07_133557-removebg-preview.png";
import { GOOGLE_CLIENT_ID } from "../../config/env";

interface GoogleCredentialResponse {
   credential?: string;
}

interface GooglePromptMomentNotification {
   isNotDisplayed?: () => boolean;
   isSkippedMoment?: () => boolean;
   isDismissedMoment?: () => boolean;
   getNotDisplayedReason?: () => string;
   getSkippedReason?: () => string;
   getDismissedReason?: () => string;
}

declare global {
   interface Window {
      google?: {
         accounts: {
            id: {
               initialize: (options: {
                  client_id: string;
                  callback: (response: GoogleCredentialResponse) => void;
               }) => void;
               prompt: (listener?: (notification: GooglePromptMomentNotification) => void) => void;
            };
         };
      };
   }
}

function mapGooglePromptReason(reason: string): string {
   const mapping: Record<string, string> = {
      invalid_client: "Google Client ID không hợp lệ",
      missing_client_id: "Thiếu Google Client ID",
      unregistered_origin: "Domain hiện tại chưa được khai báo trong Google Console",
      secure_http_required: "Google Sign-In yêu cầu HTTPS (localhost là ngoại lệ)",
      browser_not_supported: "Trình duyệt hiện tại không hỗ trợ Google Sign-In",
      opt_out_or_no_session: "Trình duyệt không có phiên đăng nhập Google hợp lệ",
      suppressed_by_user: "Google prompt đã bị người dùng tắt trước đó",
      unknown_reason: "Google prompt không thể hiển thị",
   };

   return mapping[reason] ?? `Google prompt bị bỏ qua (${reason})`;
}

function buildNameFromEmail(email: string) {
   const localPart = email.split("@")[0] ?? "user";
   return localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
}

function decodeGoogleProfile(idToken: string): { email: string; name?: string; picture?: string } | null {
   try {
      const payloadSegment = idToken.split(".")[1];
      if (!payloadSegment) {
         return null;
      }

      const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(padded), (char) => char.charCodeAt(0)));
      const payload = JSON.parse(decoded) as { email?: string; name?: string; picture?: string };

      if (typeof payload.email === "string" && payload.email.trim()) {
         return {
            email: payload.email.trim().toLowerCase(),
            name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : undefined,
            picture: typeof payload.picture === "string" && payload.picture.trim() ? payload.picture : undefined,
         };
      }

      return null;
   } catch {
      return null;
   }
}

function getSafeNextPath() {
   if (typeof window === "undefined") return "/";
   const requestedPath = new URLSearchParams(window.location.search).get("next");
   if (!requestedPath?.startsWith("/") || requestedPath.startsWith("//")) return "/";
   try {
      const resolved = new URL(requestedPath, window.location.origin);
      return resolved.origin === window.location.origin
         ? `${resolved.pathname}${resolved.search}${resolved.hash}`
         : "/";
   } catch {
      return "/";
   }
}

export default function LoginPage() {
   const router = useRouter();
   const [showPassword, setShowPassword] = useState(false);
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [errorMessage, setErrorMessage] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
   const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
   const [isCheckingSession, setIsCheckingSession] = useState(true);

   useEffect(() => {
      setCurrentUser(readAuthUser());
      const suggestedEmail = new URLSearchParams(window.location.search).get("email")?.trim().toLowerCase();
      if (suggestedEmail) setEmail(suggestedEmail);
      setIsCheckingSession(false);
   }, []);

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password) {
         setErrorMessage("Vui lòng nhập email và mật khẩu để đăng nhập.");
         return;
      }

      setIsSubmitting(true);
      setErrorMessage("");

      try {
         const loginRes = await loginUser({
            email: trimmedEmail,
            password,
         });

         const now = new Date().toISOString();
         setAuthSession({
            name: buildNameFromEmail(trimmedEmail),
            email: trimmedEmail,
            authProvider: "LOCAL",
            createdAt: now,
            lastLoginAt: now,
         }, loginRes.accessToken);

         setCurrentUser(readAuthUser());
         router.replace(getSafeNextPath());
      } catch (error) {
         if (error instanceof Error && error.message.trim()) {
            setErrorMessage(error.message);
         } else {
            setErrorMessage("Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.");
         }
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleGoogleLogin = async () => {
      setErrorMessage("");

      if (!GOOGLE_CLIENT_ID) {
         setErrorMessage("Thiếu cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID ở frontend.");
         return;
      }

      if (!window.google?.accounts?.id) {
         setErrorMessage("Google SDK chưa sẵn sàng. Vui lòng tải lại trang.");
         return;
      }

      setIsGoogleSubmitting(true);
      let callbackTriggered = false;
      const timeoutId = window.setTimeout(() => {
         if (!callbackTriggered) {
            setIsGoogleSubmitting(false);
            setErrorMessage("Google chưa phản hồi. Hãy kiểm tra popup/FedCM, cấu hình Google Client ID và Authorized JavaScript origins.");
         }
      }, 15000);

      window.google.accounts.id.initialize({
         client_id: GOOGLE_CLIENT_ID,
         callback: async (response: GoogleCredentialResponse) => {
               callbackTriggered = true;
               window.clearTimeout(timeoutId);

               try {
                  if (!response.credential) {
                     throw new Error("Không lấy được Google ID token.");
                  }

                  const loginRes = await loginWithGoogle({ idToken: response.credential });

                  const googleProfile = decodeGoogleProfile(response.credential);
                  if (!googleProfile) {
                     throw new Error("Không lấy được email từ tài khoản Google.");
                  }

                  const now = new Date().toISOString();
                  setAuthSession({
                     name: googleProfile.name ?? buildNameFromEmail(googleProfile.email),
                     email: googleProfile.email,
                     avatarDataUrl: googleProfile.picture,
                     authProvider: "GOOGLE",
                     createdAt: now,
                     lastLoginAt: now,
                  }, loginRes.accessToken);

                  setCurrentUser(readAuthUser());
                  router.replace(getSafeNextPath());
               } catch (error) {
                  if (error instanceof Error && error.message.trim()) {
                     setErrorMessage(error.message);
                  } else {
                     setErrorMessage("Đăng nhập Google thất bại.");
                  }
               } finally {
                  setIsGoogleSubmitting(false);
               }
         },
      });

      window.google.accounts.id.prompt((notification) => {
         if (callbackTriggered) {
            return;
         }

         if (notification.isNotDisplayed?.()) {
            window.clearTimeout(timeoutId);
            setIsGoogleSubmitting(false);
            const reason = notification.getNotDisplayedReason?.() ?? "unknown_reason";
            setErrorMessage(`Google Sign-In chưa thể hiển thị: ${mapGooglePromptReason(reason)}.`);
            return;
         }

         if (notification.isSkippedMoment?.()) {
            window.clearTimeout(timeoutId);
            setIsGoogleSubmitting(false);
            const reason = notification.getSkippedReason?.() ?? "unknown_reason";
            setErrorMessage(`Google Sign-In bị bỏ qua: ${mapGooglePromptReason(reason)}.`);
            return;
         }

         if (notification.isDismissedMoment?.()) {
            const dismissedReason = notification.getDismissedReason?.() ?? "unknown_reason";
            if (dismissedReason !== "credential_returned") {
               window.clearTimeout(timeoutId);
               setIsGoogleSubmitting(false);
               setErrorMessage(`Google Sign-In đã đóng: ${mapGooglePromptReason(dismissedReason)}.`);
            }
         }
      });
   };

   const userInitial = currentUser?.name?.trim().charAt(0).toUpperCase() ?? "U";
   const logoSrc = typeof logoImg === 'string' ? logoImg : (logoImg as any).src;

   if (isCheckingSession) {
      return <div role="status" className="mx-auto h-80 max-w-5xl animate-pulse rounded-3xl bg-slate-100" aria-label="Đang kiểm tra phiên đăng nhập" />;
   }

   return (
      <div className="res-auth-layout" style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>
         {/* Left — Decorative panel */}
         <div className="res-auth-deco" style={{
            flex: "1 1 300px",
            borderRadius: "24px",
            background: "linear-gradient(145deg, #f8fafc 0%, #ecfdf5 45%, #f8fafc 100%)",
            padding: "48px 40px",
            position: "relative",
            overflow: "hidden",
            minHeight: "480px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
         }}>
            <div style={{
               position: "absolute", top: "-60px", right: "-40px", width: "220px", height: "220px",
               borderRadius: "50%", background: "rgba(167,243,208,0.2)", filter: "blur(40px)",
            }} />
            <div style={{
               position: "absolute", bottom: "-40px", left: "20%", width: "180px", height: "180px",
               borderRadius: "50%", background: "rgba(110,231,183,0.15)", filter: "blur(35px)",
            }} />

            <div>
               <div style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  background: "rgba(255,255,255,0.92)", borderRadius: "12px",
                  border: "1px solid rgba(148,163,184,0.18)",
                  padding: "8px 14px", marginBottom: "24px",
               }}>
                  <img src={logoSrc} alt="JobPilot logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
                  <span style={{ color: "#0f172a", fontWeight: 800, fontSize: "16px", letterSpacing: "-0.01em" }}>JobPilot</span>
               </div>

               <h2 style={{
                  fontSize: "28px", fontWeight: 800, color: "#0f172a",
                  lineHeight: 1.25, letterSpacing: "-0.02em", marginBottom: "16px",
               }}>
                  Chào mừng trở lại! 👋
               </h2>
               <p style={{ color: "#334155", fontSize: "14px", lineHeight: 1.7 }}>
                  Đăng nhập để tiếp tục hành trình nghề nghiệp của bạn cùng JobPilot.
               </p>
            </div>

            <div style={{
               background: "rgba(255,255,255,0.92)", borderRadius: "16px",
               padding: "20px", backdropFilter: "blur(8px)",
               border: "1px solid rgba(148,163,184,0.18)",
            }}>
               <p style={{ color: "#334155", fontSize: "13px", lineHeight: 1.7, marginBottom: "12px" }}>
                  "JobPilot giúp mình tìm được việc ưng ý chỉ trong 3 tuần — CV mẫu rất xịn!"
               </p>
               <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                     width: "32px", height: "32px", borderRadius: "50%",
                     background: "linear-gradient(135deg, #e2e8f0, #cbd5e1)",
                     display: "flex", alignItems: "center", justifyContent: "center",
                     fontSize: "13px", fontWeight: 800, color: "#0f172a",
                  }}>A</div>
                  <div>
                     <p style={{ color: "#0f172a", fontSize: "13px", fontWeight: 700 }}>Anh Tuấn</p>
                     <p style={{ color: "#475569", fontSize: "11px" }}>Frontend Developer tại NovaTech</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Right — Form */}
         <div style={{ flex: "1 1 340px" }}>
            <div className="res-auth-form-card" style={{
               background: "#fff", borderRadius: "24px", padding: "40px",
               boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #f1f5f9",
            }}>
               {currentUser ? (
                  <div>
                     <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "8px" }}>
                        Bạn đã đăng nhập
                     </h1>
                     <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "26px" }}>
                        Profile người dùng đang hoạt động trên JobPilot.
                     </p>

                     <div style={{
                        border: "1px solid #d1fae5",
                        background: "#ecfdf5",
                        borderRadius: "16px",
                        padding: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        marginBottom: "18px",
                     }}>
                        <div style={{
                           width: "42px",
                           height: "42px",
                           borderRadius: "999px",
                           background: "#10b981",
                           color: "#fff",
                           fontWeight: 800,
                           display: "flex",
                           alignItems: "center",
                           justifyContent: "center",
                        }}>
                           {userInitial}
                        </div>
                        <div>
                           <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#0f172a" }}>{currentUser.name}</p>
                           <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#334155" }}>{currentUser.email}</p>
                        </div>
                     </div>

                     <div style={{ display: "flex", gap: "10px" }}>
                        <button
                           style={{
                              flex: 1,
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              color: "#fff",
                              borderRadius: "12px",
                              padding: "12px",
                              fontSize: "14px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer",
                           }}
                           onClick={() => router.push("/")}
                        >
                           Về trang chủ
                        </button>
                        <button
                           style={{
                              flex: 1,
                              background: "#fff",
                              color: "#475569",
                              borderRadius: "12px",
                              padding: "12px",
                              fontSize: "14px",
                              fontWeight: 700,
                              border: "1px solid #e2e8f0",
                              cursor: "pointer",
                           }}
                           onClick={() => {
                              clearAuthUser();
                              setCurrentUser(null);
                           }}
                        >
                           Đăng xuất
                        </button>
                     </div>
                  </div>
               ) : (
                  <>
                     <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                        Đăng nhập
                     </h1>
                     <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "32px" }}>
                        Chưa có tài khoản?{" "}
                        <Link href="/dang-ky" style={{ color: "#10b981", fontWeight: 700, textDecoration: "none" }}>
                           Đăng ký miễn phí
                        </Link>
                     </p>

                     <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                        <div>
                           <label htmlFor="login-email" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                              Email
                           </label>
                           <input
                              id="login-email"
                              name="email"
                              type="email"
                              autoComplete="email"
                              required
                              aria-invalid={Boolean(errorMessage)}
                              aria-describedby={errorMessage ? "login-error" : undefined}
                              placeholder="ban@example.com"
                              value={email}
                              onChange={(event) => setEmail(event.target.value)}
                              style={{
                                 width: "100%", borderRadius: "12px",
                                 border: "1.5px solid #e2e8f0", padding: "11px 14px",
                                 fontSize: "14px", outline: "none", color: "#0f172a",
                                 boxSizing: "border-box", transition: "border-color 0.2s",
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)"; }}
                              onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                           />
                        </div>

                        <div>
                           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <label htmlFor="login-password" style={{ fontSize: "13px", fontWeight: 700, color: "#374151" }}>Mật khẩu</label>
                              <button
                                 type="button"
                                 onClick={() => setErrorMessage("Backend hiện chưa có API đặt lại mật khẩu. Vui lòng liên hệ hotro@jobpilot.vn để được hỗ trợ.")}
                                 style={{ fontSize: "12px", color: "#10b981", fontWeight: 600, border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
                              >
                                 Quên mật khẩu?
                              </button>
                           </div>
                           <div style={{ position: "relative" }}>
                              <input
                                 id="login-password"
                                 name="password"
                                 type={showPassword ? "text" : "password"}
                                 autoComplete="current-password"
                                 required
                                 aria-invalid={Boolean(errorMessage)}
                                 aria-describedby={errorMessage ? "login-error" : undefined}
                                 placeholder="••••••••"
                                 value={password}
                                 onChange={(event) => setPassword(event.target.value)}
                                 style={{
                                    width: "100%", borderRadius: "12px",
                                    border: "1.5px solid #e2e8f0", padding: "11px 44px 11px 14px",
                                    fontSize: "14px", outline: "none", color: "#0f172a",
                                    boxSizing: "border-box", transition: "border-color 0.2s",
                                 }}
                                 onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)"; }}
                                 onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                              />
                              <button
                                 type="button"
                                 onClick={() => setShowPassword(!showPassword)}
                                 aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                                 aria-pressed={showPassword}
                                 style={{
                                    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                                    background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                                 }}
                              >
                                 {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                              </button>
                           </div>
                        </div>

                        {errorMessage && (
                           <p id="login-error" role="alert" style={{ margin: 0, color: "#dc2626", fontSize: "13px", fontWeight: 600 }}>{errorMessage}</p>
                        )}

                        <button type="submit" disabled={isSubmitting || isGoogleSubmitting} style={{
                           width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                           background: "linear-gradient(135deg, #34d399, #10b981)",
                           color: "#fff", borderRadius: "12px", padding: "13px",
                           fontSize: "15px", fontWeight: 700, border: "none", cursor: "pointer",
                           opacity: isSubmitting ? 0.8 : 1,
                           boxShadow: "0 8px 25px rgba(52,211,153,0.28)",
                           transition: "transform 0.2s, box-shadow 0.2s",
                        }}
                           onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 30px rgba(16,185,129,0.36)"; }}
                           onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 25px rgba(52,211,153,0.28)"; }}
                        >
                           {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"} <ArrowRight style={{ width: 16, height: 16 }} />
                        </button>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                           <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
                           <span style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>hoặc</span>
                           <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
                        </div>

                        <button type="button" disabled={isSubmitting || isGoogleSubmitting} style={{
                           width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                           background: "#fff", color: "#374151",
                           border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "11px",
                           fontSize: "14px", fontWeight: 600, cursor: "pointer",
                           opacity: isGoogleSubmitting ? 0.8 : 1,
                           transition: "border-color 0.2s",
                        }}
                           onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#94a3b8"; }}
                           onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e2e8f0"; }}
                           onClick={handleGoogleLogin}
                        >
                           <svg width="18" height="18" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                           </svg>
                           {isGoogleSubmitting ? "Đang mở Google..." : "Tiếp tục với Google"}
                        </button>
                     </form>
                  </>
               )}
            </div>
         </div>
      </div>
   );
}
