'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, User, Mail, Lock, CheckCircle2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import logoImg from "../../assets/logo/Screenshot_2026-05-07_133557-removebg-preview.png";
import { loginWithGoogle, registerUser } from "../../services/authApi";
import { readAuthUser, saveAccountProfile, setAuthSession } from "../../utils/auth";
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

interface PasswordStrength {
   label: "Yếu" | "Trung bình" | "Mạnh";
   bars: number;
   color: string;
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

function getPasswordStrength(password: string): PasswordStrength {
   if (!password) {
      return { label: "Yếu", bars: 1, color: "#ef4444" };
   }

   const score = [
      password.length >= 8,
      /[a-z]/.test(password) && /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
   ].filter(Boolean).length;

   if (password.length < 8 || score <= 1) {
      return { label: "Yếu", bars: 1, color: "#ef4444" };
   }

   if (score <= 3) {
      return { label: "Trung bình", bars: 2, color: "#f59e0b" };
   }

   return { label: "Mạnh", bars: 4, color: "#10b981" };
}

const perks = [
   "Lưu và quản lý nhiều mẫu CV",
   "Nhận gợi ý việc làm phù hợp",
   "Ứng tuyển chỉ với 1 click",
   "Theo dõi trạng thái ứng tuyển",
];

export default function RegisterPage() {
   const router = useRouter();
   const [showPassword, setShowPassword] = useState(false);
   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
   const [fullName, setFullName] = useState("");
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [confirmPassword, setConfirmPassword] = useState("");
   const [acceptedTerms, setAcceptedTerms] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");
   const [successMessage, setSuccessMessage] = useState("");
   const [isCheckingSession, setIsCheckingSession] = useState(true);
   const passwordStrength = getPasswordStrength(password);

   useEffect(() => {
      if (readAuthUser()) {
         router.replace("/ho-so-nguoi-dung");
         return;
      }
      setIsCheckingSession(false);
   }, [router]);

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedEmail = email.trim().toLowerCase();
      const normalizedName = fullName.trim().replace(/\s+/g, " ");

      if (normalizedName.length < 2 || normalizedName.length > 80) {
         setErrorMessage("Họ và tên cần có từ 2 đến 80 ký tự.");
         return;
      }

      if (!trimmedEmail) {
         setErrorMessage("Vui lòng nhập email.");
         return;
      }

      if (password.length < 8) {
         setErrorMessage("Mật khẩu phải có ít nhất 8 ký tự.");
         return;
      }

      if (password !== confirmPassword) {
         setErrorMessage("Mật khẩu xác nhận chưa khớp.");
         return;
      }

      if (!acceptedTerms) {
         setErrorMessage("Vui lòng đồng ý điều khoản để tiếp tục.");
         return;
      }

      setIsSubmitting(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
         await registerUser({
            email: trimmedEmail,
            password,
         });

         const createdAt = new Date().toISOString();
         saveAccountProfile(trimmedEmail, { name: normalizedName, createdAt });

         setSuccessMessage("Đăng ký thành công. Bạn sẽ được chuyển sang trang đăng nhập.");
         setTimeout(() => {
            router.replace(`/dang-nhap?email=${encodeURIComponent(trimmedEmail)}`);
         }, 1200);
      } catch (error) {
         if (error instanceof Error && error.message.trim()) {
            setErrorMessage(error.message);
         } else {
            setErrorMessage("Đăng ký thất bại. Vui lòng thử lại.");
         }
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleGoogleRegister = async () => {
      setErrorMessage("");
      setSuccessMessage("");

      if (!acceptedTerms) {
         setErrorMessage("Vui lòng đồng ý điều khoản để tiếp tục với Google.");
         return;
      }

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

                  const loginResult = await loginWithGoogle({ idToken: response.credential });
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
                  }, loginResult.accessToken);

                  router.push("/");
               } catch (error) {
                  if (error instanceof Error && error.message.trim()) {
                     setErrorMessage(error.message);
                  } else {
                     setErrorMessage("Đăng ký bằng Google thất bại.");
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

   const logoSrc = typeof logoImg === 'string' ? logoImg : (logoImg as any).src;

   if (isCheckingSession) {
      return <div role="status" className="mx-auto h-80 max-w-5xl animate-pulse rounded-3xl bg-slate-100" aria-label="Đang kiểm tra phiên đăng nhập" />;
   }

   return (
      <div className="res-auth-layout" style={{ display: "flex", gap: "32px", alignItems: "flex-start", flexWrap: "wrap" }}>
         {/* Left — Form */}
         <div style={{ flex: "1 1 340px" }}>
            <div className="res-auth-form-card" style={{
               background: "#fff", borderRadius: "24px", padding: "40px",
               boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #f1f5f9",
            }}>
               <div style={{ display: "flex", gap: "6px", marginBottom: "28px" }}>
                  {[1, 2, 3].map((step) => (
                     <div key={step} style={{
                        height: "4px", flex: 1, borderRadius: "99px",
                        background: step === 1 ? "#10b981" : step === 2 ? "#a7f3d0" : "#cbd5e1",
                     }} />
                  ))}
               </div>

               <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "6px" }}>
                  Tạo tài khoản
               </h1>
               <p style={{ fontSize: "14px", color: "#64748b", marginBottom: "32px" }}>
                  Đã có tài khoản?{" "}
                  <Link href="/dang-nhap" style={{ color: "#10b981", fontWeight: 700, textDecoration: "none" }}>
                     Đăng nhập
                  </Link>
               </p>

               <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                  <div>
                     <label htmlFor="register-name" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Họ và tên
                     </label>
                     <div style={{ position: "relative" }}>
                        <User style={{
                           position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                           width: 15, height: 15, color: "#94a3b8",
                        }} />
                        <input
                           id="register-name"
                           name="name"
                           type="text"
                           autoComplete="name"
                           required
                           maxLength={80}
                           placeholder="Nguyễn Văn A"
                           value={fullName}
                           onChange={(event) => setFullName(event.target.value)}
                           style={{
                              width: "100%", borderRadius: "12px",
                              border: "1.5px solid #e2e8f0", padding: "11px 14px 11px 38px",
                              fontSize: "14px", outline: "none", color: "#0f172a",
                              boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
                           }}
                           onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)"; }}
                           onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                     </div>
                  </div>

                  <div>
                     <label htmlFor="register-email" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Email
                     </label>
                     <div style={{ position: "relative" }}>
                        <Mail style={{
                           position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                           width: 15, height: 15, color: "#94a3b8",
                        }} />
                        <input
                           id="register-email"
                           name="email"
                           type="email"
                           autoComplete="email"
                           required
                           placeholder="ban@example.com"
                           value={email}
                           onChange={(event) => setEmail(event.target.value)}
                           style={{
                              width: "100%", borderRadius: "12px",
                              border: "1.5px solid #e2e8f0", padding: "11px 14px 11px 38px",
                              fontSize: "14px", outline: "none", color: "#0f172a",
                              boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
                           }}
                           onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)"; }}
                           onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                     </div>
                  </div>

                  <div>
                     <label htmlFor="register-password" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Mật khẩu
                     </label>
                     <div style={{ position: "relative" }}>
                        <Lock style={{
                           position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                           width: 15, height: 15, color: "#94a3b8",
                        }} />
                        <input
                           id="register-password"
                           name="password"
                           type={showPassword ? "text" : "password"}
                           autoComplete="new-password"
                           required
                           minLength={8}
                           aria-describedby="password-strength"
                           placeholder="Tối thiểu 8 ký tự"
                           value={password}
                           onChange={(event) => setPassword(event.target.value)}
                           style={{
                              width: "100%", borderRadius: "12px",
                              border: "1.5px solid #e2e8f0", padding: "11px 44px 11px 38px",
                              fontSize: "14px", outline: "none", color: "#0f172a",
                              boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
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
                           {showPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                     </div>
                     <div style={{ display: "flex", gap: "4px", marginTop: "8px" }}>
                        {[1, 2, 3, 4].map((i) => (
                           <div key={i} style={{
                              flex: 1, height: "3px", borderRadius: "99px",
                              background: i <= passwordStrength.bars ? passwordStrength.color : "#f1f5f9",
                           }} />
                        ))}
                     </div>
                     <p id="password-strength" aria-live="polite" style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                        Độ mạnh: <span style={{ color: passwordStrength.color, fontWeight: 700 }}>{passwordStrength.label}</span>
                     </p>
                  </div>

                  <div>
                     <label htmlFor="register-confirm-password" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#374151", marginBottom: "8px" }}>
                        Xác nhận mật khẩu
                     </label>
                     <div style={{ position: "relative" }}>
                        <Lock style={{
                           position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
                           width: 15, height: 15, color: "#94a3b8",
                        }} />
                        <input
                           id="register-confirm-password"
                           name="confirmPassword"
                           type={showConfirmPassword ? "text" : "password"}
                           autoComplete="new-password"
                           required
                           placeholder="Nhập lại mật khẩu"
                           value={confirmPassword}
                           onChange={(event) => setConfirmPassword(event.target.value)}
                           style={{
                              width: "100%", borderRadius: "12px",
                              border: "1.5px solid #e2e8f0", padding: "11px 44px 11px 38px",
                              fontSize: "14px", outline: "none", color: "#0f172a",
                              boxSizing: "border-box", transition: "border-color 0.2s, box-shadow 0.2s",
                           }}
                           onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)"; }}
                           onBlur={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                        <button
                           type="button"
                           onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                           aria-label={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"}
                           aria-pressed={showConfirmPassword}
                           style={{
                              position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                              background: "none", border: "none", cursor: "pointer", color: "#94a3b8",
                           }}
                        >
                           {showConfirmPassword ? <EyeOff style={{ width: 15, height: 15 }} /> : <Eye style={{ width: 15, height: 15 }} />}
                        </button>
                     </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                     <input
                        id="register-terms"
                        name="acceptedTerms"
                        type="checkbox"
                        required
                        aria-describedby="register-terms-description"
                        checked={acceptedTerms}
                        onChange={(event) => setAcceptedTerms(event.target.checked)}
                        style={{ marginTop: "2px", accentColor: "#10b981" }}
                     />
                     <span id="register-terms-description" style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
                        <label htmlFor="register-terms" style={{ cursor: "pointer" }}>Tôi đồng ý với</label>{" "}
                        <button
                           type="button"
                           onClick={() => setErrorMessage("Tài liệu Điều khoản dịch vụ chưa được cung cấp trong dự án và cần hoàn thiện trước khi phát hành production.")}
                           style={{ color: "#10b981", fontWeight: 600, border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
                        >
                           Điều khoản dịch vụ
                        </button>
                        {" "}và{" "}
                        <button
                           type="button"
                           onClick={() => setErrorMessage("Tài liệu Chính sách bảo mật chưa được cung cấp trong dự án và cần hoàn thiện trước khi phát hành production.")}
                           style={{ color: "#10b981", fontWeight: 600, border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
                        >
                           Chính sách bảo mật
                        </button>
                     </span>
                  </div>

                  {errorMessage && (
                     <p role="alert" style={{ margin: 0, color: "#dc2626", fontSize: "13px", fontWeight: 600 }}>{errorMessage}</p>
                  )}

                  {successMessage && (
                     <p role="status" aria-live="polite" style={{ margin: 0, color: "#059669", fontSize: "13px", fontWeight: 600 }}>{successMessage}</p>
                  )}

                  <button
                     type="submit"
                     disabled={isSubmitting || isGoogleSubmitting}
                     style={{
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
                     {isSubmitting ? "Đang tạo tài khoản..." : "Tạo tài khoản ngay"}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                     <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
                     <span style={{ fontSize: "12px", color: "#94a3b8" }}>hoặc</span>
                     <div style={{ flex: 1, height: "1px", background: "#f1f5f9" }} />
                  </div>

                  <button
                     type="button"
                     disabled={isSubmitting || isGoogleSubmitting}
                     style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                        background: "#fff", color: "#374151",
                        border: "1.5px solid #e2e8f0", borderRadius: "12px", padding: "11px",
                        fontSize: "14px", fontWeight: 600, cursor: "pointer",
                        opacity: isGoogleSubmitting ? 0.8 : 1,
                     }}
                     onClick={handleGoogleRegister}
                  >
                     <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                     </svg>
                     {isGoogleSubmitting ? "Đang mở Google..." : "Đăng ký bằng Google"}
                  </button>
               </form>
            </div>
         </div>

         {/* Right — Perks panel */}
         <div className="res-auth-deco" style={{
            flex: "1 1 300px",
            borderRadius: "24px",
            background: "linear-gradient(145deg, #f8fafc 0%, #ecfdf5 40%, #f8fafc 100%)",
            padding: "48px 40px",
            position: "relative",
            overflow: "hidden",
            minHeight: "480px",
         }}>
            <div style={{
               position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px",
               borderRadius: "50%", background: "rgba(16,185,129,0.08)", filter: "blur(40px)",
            }} />
            <div style={{
               position: "absolute", bottom: "-30px", left: "10%", width: "150px", height: "150px",
               borderRadius: "50%", background: "rgba(148,163,184,0.08)", filter: "blur(35px)",
            }} />

            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "32px", background: "rgba(255,255,255,0.92)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: "12px", padding: "10px 14px" }}>
               <img src={logoSrc} alt="JobPilot logo" style={{ width: 18, height: 18, objectFit: "contain" }} />
               <span style={{ color: "#0f172a", fontWeight: 800, fontSize: "16px" }}>JobPilot</span>
            </div>

            <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "8px" }}>
               Mở khóa toàn bộ tính năng
            </h2>
            <p style={{ fontSize: "14px", color: "#334155", marginBottom: "32px", lineHeight: 1.6 }}>
               Tạo tài khoản miễn phí và bắt đầu hành trình sự nghiệp ngay hôm nay.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
               {perks.map((perk) => (
                  <div key={perk} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                     <div style={{
                        width: "22px", height: "22px", borderRadius: "50%",
                        background: "rgba(255,255,255,0.88)", border: "1px solid rgba(16,185,129,0.22)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                     }}>
                        <CheckCircle2 style={{ width: 13, height: 13, color: "#10b981" }} />
                     </div>
                     <span style={{ fontSize: "14px", color: "#0f172a", lineHeight: 1.5 }}>{perk}</span>
                  </div>
               ))}
            </div>

            <div style={{
               marginTop: "40px", paddingTop: "28px",
               borderTop: "1px solid rgba(148,163,184,0.18)",
            }}>
               <div style={{ display: "flex", gap: "-8px" }}>
                  {["A", "B", "C", "D"].map((l, i) => (
                     <div key={l} style={{
                        width: "32px", height: "32px", borderRadius: "50%",
                        background: ["#d1fae5", "#a7f3d0", "#6ee7b7", "#a7f3d0"][i],
                        border: "2px solid #047857",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "12px", fontWeight: 800, color: "#047857",
                        marginLeft: i > 0 ? "-8px" : "0",
                     }}>
                        {l}
                     </div>
                  ))}
               </div>
               <p style={{ fontSize: "12px", color: "#475569", marginTop: "10px" }}>
                  <span style={{ color: "#10b981", fontWeight: 700 }}>15,000+</span> bạn trẻ đã tìm được việc cùng JobPilot
               </p>
            </div>
         </div>
      </div>
   );
}
