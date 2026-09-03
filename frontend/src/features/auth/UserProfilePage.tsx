'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
   Activity, Briefcase, Check, Clock3, Download, FileText, LogOut, Mail,
   Pencil, Save, ShieldCheck, Trash2, Upload, UserRound, X,
} from "lucide-react";
import {
   clearAuthUser, readAuthSessionInfo, readAuthUser, subscribeAuthUserChange,
   updateAuthUser, type AuthSessionInfo, type AuthUser,
} from "../../utils/auth";

const hometownOptions = [
   "An Giang", "Bắc Ninh", "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk",
   "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Nội", "Hà Tĩnh", "Hải Phòng",
   "Hưng Yên", "Khánh Hòa", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Nghệ An",
   "Ninh Bình", "Phú Thọ", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La",
   "Tây Ninh", "Thái Nguyên", "Thanh Hóa", "TP Hồ Chí Minh", "Tuyên Quang", "Vĩnh Long",
];

type Feedback = { kind: "success" | "error" | "info"; message: string } | null;
type ProfileForm = {
   name: string;
   avatarDataUrl: string;
   phone: string;
   hometown: string;
   gender: "Nam" | "Nữ" | "Khác" | "";
   age: string;
};

const emptyForm: ProfileForm = { name: "", avatarDataUrl: "", phone: "", hometown: "", gender: "", age: "" };
const toForm = (user: AuthUser): ProfileForm => ({
   name: user.name ?? "",
   avatarDataUrl: user.avatarDataUrl ?? "",
   phone: user.phone ?? "",
   hometown: user.hometown ?? "",
   gender: user.gender ?? "",
   age: user.age ? String(user.age) : "",
});

const readStoredList = (key: string): unknown[] => {
   try {
      const value = localStorage.getItem(key);
      if (!value) return [];
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
   } catch {
      return [];
   }
};

const readAccountCounts = () => ({
   cvs: readStoredList("jobpilot.my-cvs").length,
   applications: readStoredList("jobpilot_applications").length,
   savedJobs: readStoredList("jobpilot_saved_jobs").length,
});

const formatDateTime = (date?: Date | string) => {
   if (!date) return "Không xác định";
   const parsed = date instanceof Date ? date : new Date(date);
   if (Number.isNaN(parsed.getTime())) return "Không xác định";
   return parsed.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
   });
};

const resizeAvatar = (file: File): Promise<string> =>
   new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
      reader.onload = () => {
         const image = new Image();
         image.onerror = () => reject(new Error("File ảnh không hợp lệ."));
         image.onload = () => {
            const maxSize = 512;
            const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext("2d");
            if (!context) {
               reject(new Error("Trình duyệt không hỗ trợ xử lý ảnh."));
               return;
            }
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/webp", 0.82));
         };
         image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
   });

export default function UserProfilePage() {
   const router = useRouter();
   const avatarInputRef = useRef<HTMLInputElement>(null);
   const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
   const [form, setForm] = useState<ProfileForm>(emptyForm);
   const [initialForm, setInitialForm] = useState<ProfileForm>(emptyForm);
   const [sessionInfo, setSessionInfo] = useState<AuthSessionInfo>({ hasToken: false, isValid: false, isExpired: false });
   const [isHydrated, setIsHydrated] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [isProcessingAvatar, setIsProcessingAvatar] = useState(false);
   const [feedback, setFeedback] = useState<Feedback>(null);
   const [counts, setCounts] = useState({ cvs: 0, applications: 0, savedJobs: 0 });

   const hydrate = (user: AuthUser | null) => {
      setCurrentUser(user);
      if (user) {
         const nextForm = toForm(user);
         setForm(nextForm);
         setInitialForm(nextForm);
         setSessionInfo(readAuthSessionInfo());
         setCounts(readAccountCounts());
      } else {
         setForm(emptyForm);
         setInitialForm(emptyForm);
         setSessionInfo({ hasToken: false, isValid: false, isExpired: false });
         setCounts({ cvs: 0, applications: 0, savedJobs: 0 });
      }
   };

   useEffect(() => {
      hydrate(readAuthUser());
      setIsHydrated(true);
      const unsubscribeAuth = subscribeAuthUserChange(hydrate);
      const syncCounts = () => setCounts(readAccountCounts());
      window.addEventListener("jobpilot-data-updated", syncCounts);
      window.addEventListener("storage", syncCounts);
      return () => {
         unsubscribeAuth();
         window.removeEventListener("jobpilot-data-updated", syncCounts);
         window.removeEventListener("storage", syncCounts);
      };
   }, []);

   const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

   useEffect(() => {
      if (!isDirty) return;
      const warnBeforeUnload = (event: BeforeUnloadEvent) => {
         event.preventDefault();
         event.returnValue = "";
      };
      window.addEventListener("beforeunload", warnBeforeUnload);
      return () => window.removeEventListener("beforeunload", warnBeforeUnload);
   }, [isDirty]);

   const profileCompletion = useMemo(() => {
      if (!currentUser) return 0;
      const values = [form.name, currentUser.email, form.avatarDataUrl, form.phone, form.hometown, form.gender, form.age];
      return Math.round((values.filter((value) => String(value).trim()).length / values.length) * 100);
   }, [currentUser, form]);

   const userInitial = form.name.trim().charAt(0).toUpperCase() || "U";
   const updateField = <TField extends keyof ProfileForm>(field: TField, value: ProfileForm[TField]) => {
      setForm((current) => ({ ...current, [field]: value }));
      setFeedback(null);
   };

   const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
         setFeedback({ kind: "error", message: "Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP." });
         return;
      }
      if (file.size > 5 * 1024 * 1024) {
         setFeedback({ kind: "error", message: "Ảnh đại diện không được vượt quá 5 MB." });
         return;
      }
      setIsProcessingAvatar(true);
      try {
         updateField("avatarDataUrl", await resizeAvatar(file));
         setFeedback({ kind: "info", message: "Ảnh đã được tối ưu. Nhấn “Lưu thay đổi” để hoàn tất." });
      } catch (error) {
         setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Không thể xử lý ảnh." });
      } finally {
         setIsProcessingAvatar(false);
      }
   };

   const handleSaveProfile = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!currentUser) return;
      const normalizedName = form.name.trim().replace(/\s+/g, " ");
      if (normalizedName.length < 2 || normalizedName.length > 80) {
         setFeedback({ kind: "error", message: "Họ tên cần có từ 2 đến 80 ký tự." });
         return;
      }
      const normalizedPhone = form.phone.replace(/[\s.-]/g, "");
      if (normalizedPhone && !/^(?:\+84|0)\d{9,10}$/.test(normalizedPhone)) {
         setFeedback({ kind: "error", message: "Số điện thoại chưa đúng định dạng Việt Nam." });
         return;
      }
      const parsedAge = form.age ? Number(form.age) : undefined;
      if (parsedAge !== undefined && (!Number.isInteger(parsedAge) || parsedAge < 16 || parsedAge > 80)) {
         setFeedback({ kind: "error", message: "Độ tuổi hợp lệ từ 16 đến 80." });
         return;
      }
      const nextForm: ProfileForm = {
         ...form, name: normalizedName, phone: normalizedPhone, age: parsedAge ? String(parsedAge) : "",
      };
      try {
         const wasUpdated = updateAuthUser({
            name: nextForm.name,
            avatarDataUrl: nextForm.avatarDataUrl || undefined,
            phone: nextForm.phone || undefined,
            hometown: nextForm.hometown || undefined,
            gender: nextForm.gender || undefined,
            age: parsedAge,
            profileUpdatedAt: new Date().toISOString(),
         });
         if (!wasUpdated) throw new Error("Phiên đăng nhập không còn hợp lệ.");
         setForm(nextForm);
         setInitialForm(nextForm);
         setIsEditing(false);
         setFeedback({ kind: "success", message: "Đã lưu hồ sơ trên thiết bị này." });
      } catch (error) {
         setFeedback({
            kind: "error",
            message: error instanceof Error && error.message.includes("Phiên đăng nhập")
               ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
               : "Không thể lưu hồ sơ. Bộ nhớ trình duyệt có thể đã đầy; hãy thử ảnh nhỏ hơn hoặc xóa bớt cache.",
         });
      }
   };

   const handleCancelEdit = () => {
      setForm(initialForm);
      setIsEditing(false);
      setFeedback(null);
   };

   const handleExportData = () => {
      if (!currentUser) return;
      const exportPayload = {
         exportedAt: new Date().toISOString(),
         profile: currentUser,
         applications: readStoredList("jobpilot_applications"),
         savedJobs: readStoredList("jobpilot_saved_jobs"),
         cvs: readStoredList("jobpilot.my-cvs"),
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jobpilot-du-lieu-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setFeedback({ kind: "success", message: "Đã xuất dữ liệu tài khoản, không bao gồm JWT." });
   };

   const handleClearDeviceData = () => {
      const confirmed = window.confirm("Xóa cache CV, ứng tuyển và việc làm đã lưu trên thiết bị này? Dữ liệu trên máy chủ không bị xóa.");
      if (!confirmed) return;
      localStorage.removeItem("jobpilot.my-cvs");
      localStorage.removeItem("jobpilot_applications");
      localStorage.removeItem("jobpilot_saved_jobs");
      window.dispatchEvent(new Event("jobpilot-data-updated"));
      setCounts({ cvs: 0, applications: 0, savedJobs: 0 });
      setFeedback({ kind: "success", message: "Đã xóa dữ liệu tạm trên thiết bị. Dữ liệu máy chủ vẫn được giữ nguyên." });
   };

   const handleLogout = () => {
      if (isDirty && !window.confirm("Bạn có thay đổi chưa lưu. Vẫn đăng xuất?")) return;
      clearAuthUser();
      router.replace("/dang-nhap");
   };

   if (!isHydrated) {
      return (
         <section aria-label="Đang tải tài khoản" className="mx-auto max-w-6xl animate-pulse space-y-5">
            <div className="h-44 rounded-[30px] bg-slate-200" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
               {[1, 2, 3].map((item) => <div key={item} className="h-24 rounded-2xl bg-slate-100" />)}
            </div>
         </section>
      );
   }

   if (!currentUser) {
      return (
         <section className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><UserRound className="h-7 w-7" /></div>
            <h1 className="mt-5 text-2xl font-black text-slate-900">Tài khoản JobPilot</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">Đăng nhập để quản lý hồ sơ, CV và các hoạt động ứng tuyển của bạn.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
               <Link href="/dang-nhap?next=/ho-so-nguoi-dung" className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Đăng nhập</Link>
               <Link href="/dang-ky" className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Tạo tài khoản</Link>
            </div>
         </section>
      );
   }

   const feedbackClass = feedback?.kind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : feedback?.kind === "success"
         ? "border-emerald-200 bg-emerald-50 text-emerald-700"
         : "border-sky-200 bg-sky-50 text-sky-700";

   return (
      <section className="mx-auto max-w-6xl space-y-6">
         <div className="overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.7)] md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
               <div className="flex min-w-0 items-center gap-4">
                  <div className="relative shrink-0">
                     {form.avatarDataUrl ? <img src={form.avatarDataUrl} alt={`Ảnh đại diện của ${form.name}`} className="h-20 w-20 rounded-3xl border-2 border-white/25 object-cover shadow-xl" /> : <div className="grid h-20 w-20 place-items-center rounded-3xl border border-white/15 bg-white/10 text-3xl font-black backdrop-blur">{userInitial}</div>}
                     <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-4 border-slate-900 bg-emerald-500" title="Tài khoản đang hoạt động"><Check className="h-3 w-3" /></span>
                  </div>
                  <div className="min-w-0">
                     <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Trung tâm tài khoản</p>
                     <h1 className="mt-2 truncate text-2xl font-black tracking-tight md:text-3xl">{form.name}</h1>
                     <p className="mt-1 truncate text-sm text-slate-300">{currentUser.email}</p>
                  </div>
               </div>
               <div className="w-full rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur md:w-64">
                  <div className="flex items-center justify-between text-xs font-bold"><span>Mức độ hoàn thiện hồ sơ</span><span className="text-emerald-300">{profileCompletion}%</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${profileCompletion}%` }} /></div>
                  <p className="mt-2 text-xs leading-5 text-slate-300">Hồ sơ đầy đủ giúp bạn quản lý CV và ứng tuyển thuận tiện hơn.</p>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
               { label: "CV của tôi", value: counts.cvs, href: "/cv-cua-toi", icon: FileText, tone: "text-violet-600 bg-violet-50" },
               { label: "Đã ứng tuyển", value: counts.applications, href: "/cong-viec-da-ung-tuyen", icon: Briefcase, tone: "text-emerald-600 bg-emerald-50" },
               { label: "Việc làm đã lưu", value: counts.savedJobs, href: "/viec-lam-da-luu", icon: Activity, tone: "text-rose-600 bg-rose-50" },
            ].map(({ label, value, href, icon: Icon, tone }) => (
               <Link key={label} href={href} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></span>
                  <span><strong className="block text-xl font-black text-slate-900">{value}</strong><span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">{label}</span></span>
               </Link>
            ))}
         </div>

         {feedback && <div role={feedback.kind === "error" ? "alert" : "status"} aria-live="polite" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${feedbackClass}`}><span>{feedback.message}</span><button type="button" onClick={() => setFeedback(null)} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button></div>}

         <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
            <form onSubmit={handleSaveProfile} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
               <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><h2 className="text-lg font-black text-slate-900">Thông tin cá nhân</h2><p className="mt-1 text-sm text-slate-500">Thông tin mở rộng được lưu trên trình duyệt hiện tại.</p></div>
                  {!isEditing ? <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"><Pencil className="h-4 w-4" />Chỉnh sửa</button> : <div className="flex gap-2"><button type="button" onClick={handleCancelEdit} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">Hủy</button><button type="submit" disabled={!isDirty || isProcessingAvatar} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Save className="h-4 w-4" />Lưu thay đổi</button></div>}
               </div>

               <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl bg-slate-50 p-4">
                  {form.avatarDataUrl ? <img src={form.avatarDataUrl} alt="Ảnh đại diện" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-600 text-xl font-black text-white">{userInitial}</div>}
                  <div className="min-w-0 flex-1"><p className="text-sm font-black text-slate-800">Ảnh đại diện</p><p className="mt-1 text-xs leading-5 text-slate-500">JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được thu nhỏ về 512 px.</p></div>
                  {isEditing && <div className="flex gap-2"><input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} /><button type="button" disabled={isProcessingAvatar} onClick={() => avatarInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><Upload className="h-4 w-4" />{isProcessingAvatar ? "Đang xử lý" : "Thay ảnh"}</button>{form.avatarDataUrl && <button type="button" onClick={() => updateField("avatarDataUrl", "")} className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50" aria-label="Xóa ảnh đại diện"><Trash2 className="h-4 w-4" /></button>}</div>}
               </div>

               <fieldset disabled={!isEditing} className="mt-6 grid gap-4 md:grid-cols-2 disabled:opacity-75">
                  <label className="text-sm font-bold text-slate-700">Họ và tên<input name="name" autoComplete="name" required value={form.name} onChange={(event) => updateField("name", event.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50" /></label>
                  <label className="text-sm font-bold text-slate-700">Email đăng nhập<span className="mt-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500"><Mail className="h-4 w-4" />{currentUser.email}</span><span className="mt-1 block text-[11px] font-medium text-slate-400">Email chỉ có thể đổi khi backend hỗ trợ xác minh lại.</span></label>
                  <label className="text-sm font-bold text-slate-700">Số điện thoại<input name="phone" autoComplete="tel" type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} placeholder="0912345678" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50" /></label>
                  <label className="text-sm font-bold text-slate-700">Tỉnh/thành<select name="hometown" value={form.hometown} onChange={(event) => updateField("hometown", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"><option value="">Chưa cập nhật</option>{hometownOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                  <label className="text-sm font-bold text-slate-700">Giới tính<select name="gender" value={form.gender} onChange={(event) => updateField("gender", event.target.value as ProfileForm["gender"])} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50"><option value="">Chưa cập nhật</option><option value="Nam">Nam</option><option value="Nữ">Nữ</option><option value="Khác">Khác</option></select></label>
                  <label className="text-sm font-bold text-slate-700">Độ tuổi<input name="age" autoComplete="off" type="number" min={16} max={80} value={form.age} onChange={(event) => updateField("age", event.target.value)} placeholder="Chưa cập nhật" className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-50" /></label>
               </fieldset>
            </form>

            <div className="space-y-6">
               <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Tài khoản & phiên</h2><p className="text-xs text-slate-500">Thông tin bảo mật hiện tại</p></div></div>
                  <dl className="mt-5 space-y-4 text-sm">
                     <div className="flex justify-between gap-4"><dt className="text-slate-500">Trạng thái</dt><dd className="inline-flex items-center gap-1.5 font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Đang hoạt động</dd></div>
                     <div className="flex justify-between gap-4"><dt className="text-slate-500">Đăng nhập bằng</dt><dd className="font-bold text-slate-800">{currentUser.authProvider === "GOOGLE" ? "Google" : "Email & mật khẩu"}</dd></div>
                     <div className="flex justify-between gap-4"><dt className="text-slate-500">Đăng nhập gần nhất</dt><dd className="text-right font-semibold text-slate-700">{formatDateTime(currentUser.lastLoginAt)}</dd></div>
                     <div className="flex justify-between gap-4"><dt className="text-slate-500">Ngày tham gia</dt><dd className="text-right font-semibold text-slate-700">{formatDateTime(currentUser.createdAt)}</dd></div>
                     <div className="flex justify-between gap-4"><dt className="text-slate-500">Phiên hết hạn</dt><dd className="text-right font-semibold text-slate-700">{sessionInfo.expiresAt ? formatDateTime(sessionInfo.expiresAt) : "Backend chưa cung cấp"}</dd></div>
                  </dl>
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Đổi mật khẩu, xác minh email và xóa tài khoản cần endpoint bảo mật từ backend; frontend không giả lập các thao tác này.</div>
               </div>

               <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600"><Download className="h-5 w-5" /></span><div><h2 className="font-black text-slate-900">Dữ liệu cá nhân</h2><p className="text-xs text-slate-500">Quyền kiểm soát trên thiết bị</p></div></div>
                  <div className="mt-5 space-y-2">
                     <button type="button" onClick={handleExportData} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3.5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><span className="inline-flex items-center gap-2"><Download className="h-4 w-4" />Xuất dữ liệu JSON</span><span className="text-xs font-medium text-slate-400">Không gồm JWT</span></button>
                     <button type="button" onClick={handleClearDeviceData} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50"><Trash2 className="h-4 w-4" />Xóa dữ liệu tạm trên thiết bị</button>
                     <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-100"><LogOut className="h-4 w-4" />Đăng xuất trên thiết bị này</button>
                  </div>
               </div>

               <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                  <p className="flex items-center gap-2 font-bold text-slate-800"><Clock3 className="h-4 w-4" />Lưu ý về đồng bộ</p>
                  <p className="mt-2">Họ tên, avatar, số điện thoại và thông tin mở rộng hiện lưu ở trình duyệt. CV, ứng tuyển và việc đã lưu được đồng bộ lại từ backend khi có kết nối.</p>
               </div>
            </div>
         </div>
      </section>
   );
}
