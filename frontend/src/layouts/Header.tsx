'use client';

import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import {
   clearAuthUser,
   hasStoredAuthUser,
   readAuthSessionInfo,
   readAuthUser,
   removeLegacyAuthFields,
   subscribeAuthUserChange,
   type AuthUser,
} from "../utils/auth";
import { saveCvsToLocalStorage } from "../utils/cv";
import { userApi } from "../services/userApi";
import { cvApi } from "../services/cvApi";
import { isCvEditorRoute } from "../utils/routes";
import logoImg from "../assets/logo/Screenshot_2026-05-07_133557-removebg-preview.png";

const navLinks = [
   { label: "Tìm việc", href: "/tim-viec" },
   { label: "Công ty", href: "/cong-ty" },
   { label: "CV mẫu", href: "/cv-mau" },
   { label: "Tiện ích", href: "/tien-ich" },
   { label: "Cẩm nang", href: "/cam-nang" },
];

const isNavLinkActive = (pathname: string, href: string) =>
   pathname === href || pathname.startsWith(`${href}/`);

const protectedAccountPaths = ["/cv-cua-toi", "/cong-viec-da-ung-tuyen", "/cv-editor", "/chatbot"];
const isProtectedAccountPath = (pathname: string) =>
   protectedAccountPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export default function Header() {
   const [mobileOpen, setMobileOpen] = useState(false);
   const [profileMenuOpen, setProfileMenuOpen] = useState(false);
   const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
   const pathname = usePathname();
   const editorWorkspace = isCvEditorRoute(pathname);
   const router = useRouter();
   const profileMenuRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      const syncAuthenticatedUser = () => {
         const user = readAuthUser();
         if (editorWorkspace) {
            setCurrentUser(user);
            if (user) removeLegacyAuthFields();
            return;
         }
         if (!user && hasStoredAuthUser()) {
            clearAuthUser();
            setCurrentUser(null);
            if (isProtectedAccountPath(pathname)) {
               router.replace(`/dang-nhap?next=${encodeURIComponent(pathname)}`);
            }
            return;
         }
         setCurrentUser(user);
         if (user) removeLegacyAuthFields();
         if (!user && isProtectedAccountPath(pathname)) {
            router.replace(`/dang-nhap?next=${encodeURIComponent(pathname)}`);
         }
      };

      syncAuthenticatedUser();
      return subscribeAuthUserChange(syncAuthenticatedUser);
   }, [editorWorkspace, pathname, router]);

   useEffect(() => {
      if (!currentUser) return;
      const session = readAuthSessionInfo();
      if (!session.isValid || session.isExpired) {
         clearAuthUser();
         return;
      }
      if (!session.expiresAt) return;

      const remainingMs = session.expiresAt.getTime() - Date.now();
      const timeoutId = window.setTimeout(() => clearAuthUser(), Math.max(0, remainingMs));
      return () => window.clearTimeout(timeoutId);
   }, [currentUser]);

   useEffect(() => {
      if (editorWorkspace) return;
      if (!currentUser?.email) {
         localStorage.removeItem("jobpilot.my-cvs");
         return;
      }

      userApi.getByEmail(currentUser.email)
         .then(({ userId }) => {
            if (!userId) return;
            return cvApi.listByUser(userId);
         })
         .then((cvList) => {
            if (cvList) {
               saveCvsToLocalStorage(cvList);
            }
         })
         .catch((err) => {
            console.error("Failed to sync CVs in Header:", err);
         });
   }, [currentUser, editorWorkspace]);

   useEffect(() => {
      if (!profileMenuOpen) {
         return;
      }

      const handleClickOutside = (event: MouseEvent) => {
         if (!profileMenuRef.current?.contains(event.target as Node)) {
            setProfileMenuOpen(false);
         }
      };

      const handleEscape = (event: KeyboardEvent) => {
         if (event.key === "Escape") {
            setProfileMenuOpen(false);
         }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      return () => {
         document.removeEventListener("mousedown", handleClickOutside);
         document.removeEventListener("keydown", handleEscape);
      };
   }, [profileMenuOpen]);

   useEffect(() => {
      setProfileMenuOpen(false);
      setMobileOpen(false);
   }, [pathname]);

   const isLoginPage = pathname === "/dang-nhap";
   const isRegisterPage = pathname === "/dang-ky";

   const userInitial = currentUser?.name.trim().charAt(0).toUpperCase() ?? "U";
   const logoSrc = typeof logoImg === 'string' ? logoImg : (logoImg as any).src;
   const handleLogout = () => {
      clearAuthUser();
      setProfileMenuOpen(false);
      setMobileOpen(false);
      router.replace("/dang-nhap");
   };
   const focusFirstAccountItem = (menuId: string) => {
      window.requestAnimationFrame(() => {
         document.querySelector<HTMLElement>(`#${menuId} [role="menuitem"]`)?.focus();
      });
   };
   const handleAccountTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, menuId: string) => {
      if (event.key !== "ArrowDown") return;
      event.preventDefault();
      setProfileMenuOpen(true);
      focusFirstAccountItem(menuId);
   };
   const handleAccountMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, menuId: string) => {
      const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
      if (!items.length) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number | null = null;

      if (event.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
      if (event.key === "ArrowUp") nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = items.length - 1;
      if (event.key === "Escape") {
         event.preventDefault();
         setProfileMenuOpen(false);
         document.querySelector<HTMLButtonElement>(`[aria-controls="${menuId}"]`)?.focus();
         return;
      }
      if (event.key === "Tab") setProfileMenuOpen(false);
      if (nextIndex !== null) {
         event.preventDefault();
         items[nextIndex]?.focus();
      }
   };

   if (editorWorkspace) {
      return null;
   }

   return (
      <header className="sticky top-3 z-50 w-full px-3">
         <div className="max-w-[1200px] mx-auto px-4 md:px-6 h-[76px] flex items-center justify-between gap-4">
            <div className="flex h-[76px] w-full items-center justify-between gap-4 rounded-[24px] border border-white/35 bg-white/70 px-4 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl md:px-6">
               {/* Logo */}
               <div className="flex items-center flex-shrink-0">
                  <Link href="/" className="flex items-center gap-2.5">
                     <img
                        src={logoSrc}
                        alt="JobPilot Logo"
                        className="h-10 w-10 object-contain"
                     />
                     <div>
                        <p className="text-slate-900 font-extrabold tracking-tight leading-none">JobPilot</p>
                     </div>
                  </Link>
               </div>

               {/* Desktop Nav */}
               <nav className="hidden lg:flex items-center flex-1 justify-center">
                  <ul className="flex items-center gap-3">
                     {navLinks.map((link) => {
                        const isActive = isNavLinkActive(pathname, link.href);
                        return (
                           <li key={link.href}>
                              <Link
                                 href={link.href}
                                 className={`px-3.5 py-2 text-sm font-semibold leading-5 transition-colors rounded-full whitespace-nowrap ${isActive
                                    ? "bg-emerald-600 text-white shadow-sm"
                                    : "text-emerald-800 hover:text-emerald-900 hover:bg-emerald-100"
                                    }`}
                              >
                                 {link.label}
                              </Link>
                           </li>
                        );
                     })}
                  </ul>
               </nav>

               {/* Desktop Right Section */}
               <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
                  {currentUser ? (
                     <div className="relative" ref={profileMenuRef}>
                        <button
                           onClick={() => setProfileMenuOpen((prev) => !prev)}
                           type="button"
                           aria-label="Mở menu tài khoản"
                           aria-expanded={profileMenuOpen}
                           aria-haspopup="menu"
                           aria-controls="desktop-account-menu"
                           onKeyDown={(event) => handleAccountTriggerKeyDown(event, "desktop-account-menu")}
                           className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 transition-colors hover:bg-emerald-100"
                        >
                           {currentUser.avatarDataUrl ? (
                              <img
                                 src={currentUser.avatarDataUrl}
                                 alt="Avatar"
                                 className="h-8 w-8 rounded-full border border-emerald-200 object-cover"
                              />
                           ) : (
                              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                                 {userInitial}
                              </div>
                           )}
                           <div className="leading-tight text-left">
                              <p className="max-w-[150px] truncate text-sm font-bold text-slate-900">{currentUser.name}</p>
                              <p className="max-w-[150px] truncate text-[10px] font-medium text-slate-500">{currentUser.email}</p>
                           </div>
                           <ChevronDown className={`h-4 w-4 text-emerald-700 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                        </button>

                        {profileMenuOpen && (
                           <div id="desktop-account-menu" role="menu" onKeyDown={(event) => handleAccountMenuKeyDown(event, "desktop-account-menu")} className="absolute right-0 top-[calc(100%+10px)] w-[240px] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                              <Link
                                 href="/ho-so-nguoi-dung"
                                 role="menuitem"
                                 className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                 Trung tâm tài khoản
                              </Link>
                              <Link
                                 href="/cv-cua-toi"
                                 role="menuitem"
                                 className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                 CV của tôi
                              </Link>
                              <Link
                                 href="/cong-viec-da-ung-tuyen"
                                 role="menuitem"
                                 className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                 Công việc đã ứng tuyển
                              </Link>
                              <Link
                                 href="/viec-lam-da-luu"
                                 role="menuitem"
                                 className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                 Việc làm đã lưu
                              </Link>
                              <Link
                                 href="/cv-editor"
                                 role="menuitem"
                                 className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                              >
                                 Chỉnh sửa CV
                              </Link>
                              <button
                                 type="button"
                                 role="menuitem"
                                 onClick={handleLogout}
                                 className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                              >
                                 Đăng xuất
                              </button>
                           </div>
                        )}
                     </div>
                  ) : (
                     <>
                        <Link
                           href="/dang-nhap"
                           className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${isLoginPage ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-700 border border-white/50 bg-white/40 hover:bg-white/90 hover:text-slate-900"}`}
                        >
                           Đăng nhập
                        </Link>

                        <Link
                           href="/dang-ky"
                           className={`px-4 py-2 text-sm font-semibold rounded-full whitespace-nowrap transition-all duration-200 ${isRegisterPage ? "bg-white text-slate-900 border border-slate-200 shadow-sm" : "text-slate-700 border border-white/50 bg-white/40 hover:bg-white/90 hover:text-slate-900"}`}
                        >
                           Đăng ký
                        </Link>
                     </>
                  )}
               </div>

               {/* Mobile Toggle */}
               <button
                  className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-white/55 text-slate-800 backdrop-blur-md"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  type="button"
                  aria-label={mobileOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
                  aria-expanded={mobileOpen}
                  aria-controls="mobile-navigation"
               >
                  {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
               </button>
            </div>
         </div>

         {/* Mobile Menu */}
         {mobileOpen && (
            <div className="mx-auto mt-3 max-w-[1200px] px-3 lg:hidden">
               <div id="mobile-navigation" className="rounded-[22px] border border-white/40 bg-white/75 px-4 pb-4 pt-3 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                  <nav className="flex flex-col gap-1 pt-2">
                     {navLinks.map((link) => {
                        const isActive = isNavLinkActive(pathname, link.href);
                        return (
                           <Link
                              key={link.href}
                              href={link.href}
                              onClick={() => setMobileOpen(false)}
                              className={`px-3 py-3 text-sm font-semibold rounded-lg ${isActive
                                 ? "text-emerald-700 bg-emerald-50"
                                 : "text-slate-700 hover:text-emerald-700 hover:bg-emerald-50"
                                 }`}
                           >
                              {link.label}
                           </Link>
                        );
                     })}
                  </nav>
                  <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-white/50">
                     {currentUser ? (
                        <>
                           <button
                              onClick={() => setProfileMenuOpen((prev) => !prev)}
                              type="button"
                              aria-label="Mở menu tài khoản"
                              aria-expanded={profileMenuOpen}
                              aria-haspopup="menu"
                              aria-controls="mobile-account-menu"
                              onKeyDown={(event) => handleAccountTriggerKeyDown(event, "mobile-account-menu")}
                              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2"
                           >
                              {currentUser.avatarDataUrl ? (
                                 <img
                                    src={currentUser.avatarDataUrl}
                                    alt="Avatar"
                                    className="h-9 w-9 rounded-full border border-emerald-200 object-cover"
                                 />
                              ) : (
                                 <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                                    {userInitial}
                                 </div>
                              )}
                              <div className="min-w-0 text-left">
                                 <p className="truncate text-sm font-bold text-slate-900">{currentUser.name}</p>
                                 <p className="truncate text-[10px] font-medium text-slate-500">{currentUser.email}</p>
                              </div>
                              <ChevronDown className={`ml-auto h-4 w-4 text-emerald-700 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                           </button>

                           {profileMenuOpen && (
                              <div id="mobile-account-menu" role="menu" onKeyDown={(event) => handleAccountMenuKeyDown(event, "mobile-account-menu")} className="rounded-2xl border border-slate-200 bg-white p-2 shadow-md">
                                 <Link
                                    href="/ho-so-nguoi-dung"
                                    role="menuitem"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                 >
                                    Trung tâm tài khoản
                                 </Link>
                                 <Link
                                    href="/cv-cua-toi"
                                    role="menuitem"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                 >
                                    CV của tôi
                                 </Link>
                                 <Link
                                    href="/cong-viec-da-ung-tuyen"
                                    role="menuitem"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                 >
                                    Công việc đã ứng tuyển
                                 </Link>
                                 <Link
                                    href="/viec-lam-da-luu"
                                    role="menuitem"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                 >
                                    Việc làm đã lưu
                                 </Link>
                                 <Link
                                    href="/cv-editor"
                                    role="menuitem"
                                    onClick={() => setMobileOpen(false)}
                                    className="block rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                                 >
                                    Chỉnh sửa CV
                                 </Link>
                                 <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                                 >
                                    Đăng xuất
                                 </button>
                              </div>
                           )}
                        </>
                     ) : (
                        <>
                           <Link
                              href="/dang-nhap"
                              onClick={() => setMobileOpen(false)}
                              className="px-4 py-2.5 text-sm font-semibold text-center text-slate-700 border border-white/60 bg-white/50 rounded-full hover:bg-white/80 hover:text-slate-900 transition-colors backdrop-blur-md"
                           >
                              Đăng nhập
                           </Link>
                           <Link
                              href="/dang-ky"
                              onClick={() => setMobileOpen(false)}
                              className="px-4 py-2.5 text-sm font-semibold text-center text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors"
                           >
                              Đăng ký
                           </Link>
                        </>
                     )}
                  </div>
               </div>
            </div>
         )}
      </header>
   );
}
