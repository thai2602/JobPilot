'use client';

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  ChevronRight,
  FileText,
  Folder,
  Home,
  LogOut,
  Menu,
  Pencil,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import logoImg from "../../assets/logo/Screenshot_2026-05-07_133557-removebg-preview.png";
import {
  clearAuthUser,
  readAuthUser,
  subscribeAuthUserChange,
  type AuthUser,
} from "../../utils/auth";
import { isCvEditorRoute } from "../../utils/routes";
import { useCvContext } from "./CvContext";

type NavItem = {
  label: string;
  href: string;
  icon: typeof Home;
  editorRoute?: boolean;
};

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Khám phá",
    items: [
      { label: "Tổng quan", href: "/", icon: Home },
      { label: "Tìm việc", href: "/tim-viec", icon: Search },
      { label: "Công ty", href: "/cong-ty", icon: Building2 },
    ],
  },
  {
    label: "Hồ sơ nghề nghiệp",
    items: [
      { label: "Chỉnh sửa CV", href: "/cv-editor", icon: Pencil, editorRoute: true },
      { label: "CV của tôi", href: "/cv-cua-toi", icon: Folder },
      { label: "CV mẫu", href: "/cv-mau", icon: FileText },
      { label: "Việc làm đã lưu", href: "/viec-lam-da-luu", icon: Bookmark },
      { label: "Đã ứng tuyển", href: "/cong-viec-da-ung-tuyen", icon: Briefcase },
    ],
  },
  {
    label: "Tài nguyên",
    items: [
      { label: "Tiện ích", href: "/tien-ich", icon: Sparkles },
      { label: "Cẩm nang", href: "/cam-nang", icon: BookOpen },
    ],
  },
];

export default function CvEditorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { cvData, isDirty, dirtyRef } = useCvContext();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const logoSrc = typeof logoImg === "string" ? logoImg : (logoImg as { src: string }).src;

  useEffect(() => {
    setCurrentUser(readAuthUser());
    return subscribeAuthUserChange(setCurrentUser);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeDrawerOnDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };
    desktopQuery.addEventListener("change", closeDrawerOnDesktop);
    return () => desktopQuery.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => drawerRef.current?.querySelector<HTMLElement>("a")?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>('a, button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const completion = useMemo(() => {
    const completedSections = [
      Boolean(cvData.fullName.trim() && cvData.email.trim()),
      cvData.skills.some((item) => item.skillName.trim()),
      cvData.experiences.some((item) => item.company.trim() || item.position.trim()),
      cvData.educations.some((item) => item.school.trim() || item.major.trim()),
      cvData.projects.some((item) => item.name.trim()),
      (cvData.attachments || []).some((item) => item.name.trim()),
      (cvData.socials || []).some((item) => item.url.trim()),
    ];
    return {
      count: completedSections.filter(Boolean).length,
      percent: Math.round((completedSections.filter(Boolean).length / completedSections.length) * 100),
      total: completedSections.length,
    };
  }, [cvData]);

  const isItemActive = (item: NavItem) => {
    if (item.editorRoute) return isCvEditorRoute(pathname);
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const confirmLeaveEditor = () =>
    !dirtyRef.current || window.confirm("Bạn có thay đổi CV chưa lưu. Bạn có chắc muốn rời trang?");

  const handleNavigation = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    if (href === "/cv-editor" && isCvEditorRoute(pathname)) {
      event.preventDefault();
      setMobileOpen(false);
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      return;
    }

    if (!confirmLeaveEditor()) {
      event.preventDefault();
      return;
    }
    setMobileOpen(false);
  };

  const handleLogout = () => {
    if (!confirmLeaveEditor()) return;
    clearAuthUser();
    setMobileOpen(false);
    router.replace("/dang-nhap");
  };

  const renderSidebarContent = (mobile = false) => (
    <>
      <div className="flex h-[76px] items-center justify-between border-b border-slate-100 px-4 xl:px-5">
        <Link href="/" onClick={(event) => handleNavigation(event, "/")} className="flex min-w-0 items-center gap-2.5" aria-label="JobPilot - Trang chủ">
          <img src={logoSrc} alt="" className="h-10 w-10 shrink-0 object-contain" />
          <div className={`${mobile ? "block" : "hidden xl:block"} min-w-0`}>
            <p className="truncate text-[15px] font-black tracking-tight text-slate-950">JobPilot</p>
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">CV Studio</p>
          </div>
        </Link>
        {mobile && (
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              window.requestAnimationFrame(() => menuButtonRef.current?.focus());
            }}
            aria-label="Đóng điều hướng"
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav aria-label="Điều hướng JobPilot" className="cv-editor-sidebar-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex ? "mt-5" : ""}>
            <p className={`${mobile ? "block" : "hidden xl:block"} mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400`}>
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                    title={!mobile ? item.label : undefined}
                    onClick={(event) => handleNavigation(event, item.href)}
                    className={`group relative flex min-h-11 items-center rounded-xl px-3 text-sm font-bold transition-colors ${mobile ? "gap-3" : "justify-center gap-3 xl:justify-start"} ${active
                      ? "bg-[#0f4c51] text-white shadow-[0_8px_20px_-12px_rgba(15,76,81,0.8)]"
                      : "text-slate-600 hover:bg-emerald-50 hover:text-[#0f4c51]"
                      }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                    <span className={mobile ? "block" : "hidden xl:block"}>{item.label}</span>
                    {active && <span className="absolute right-2 h-1.5 w-1.5 rounded-full bg-emerald-300 xl:hidden" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className={`${mobile ? "block" : "hidden xl:block"} mb-3 rounded-2xl bg-slate-950 p-4 text-white`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black">Tiến độ nội dung</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">{completion.count}/{completion.total} nhóm đã có dữ liệu</p>
            </div>
            <span className="text-sm font-black text-emerald-300">{completion.percent}%</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Tiến độ nội dung CV" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion.percent}>
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${completion.percent}%` }} />
          </div>
          <Link href="/cv-cua-toi" onClick={(event) => handleNavigation(event, "/cv-cua-toi")} className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold text-white hover:bg-white/15">
            Quản lý CV <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className={`flex items-center rounded-xl border border-slate-200 bg-slate-50 p-2 ${mobile ? "gap-3" : "justify-center gap-2 xl:justify-start"}`}>
          <Link href="/ho-so-nguoi-dung" onClick={(event) => handleNavigation(event, "/ho-so-nguoi-dung")} className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="Mở trung tâm tài khoản">
            {currentUser?.avatarDataUrl ? (
              <img src={currentUser.avatarDataUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-cover" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <UserRound className="h-4 w-4" />
              </span>
            )}
            <span className={mobile ? "min-w-0" : "hidden min-w-0 xl:block"}>
              <span className="block truncate text-xs font-black text-slate-800">{currentUser?.name || "Tài khoản"}</span>
              <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">{currentUser?.email}</span>
            </span>
          </Link>
          <button type="button" onClick={handleLogout} aria-label="Đăng xuất" title="Đăng xuất" className={`${mobile ? "grid" : "hidden xl:grid"} h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600`}>
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="cv-editor-workspace-shell min-h-[calc(100vh-24px)] rounded-[28px] bg-[#f5f7f6] p-2 lg:grid lg:grid-cols-[80px_minmax(0,1fr)] lg:gap-3 xl:grid-cols-[248px_minmax(0,1fr)]">
      <div aria-hidden={mobileOpen ? true : undefined} inert={mobileOpen ? true : undefined} className="mb-3 flex h-16 items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 shadow-sm lg:hidden">
        <div className="flex min-w-0 items-center gap-2.5">
          <img src={logoSrc} alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">JobPilot CV Studio</p>
            <p className="truncate text-[10px] font-semibold text-slate-500">Không gian chỉnh sửa CV</p>
          </div>
        </div>
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Mở điều hướng"
          aria-expanded={mobileOpen}
          aria-controls="cv-editor-mobile-navigation"
          className="grid h-11 w-11 place-items-center rounded-xl bg-[#0f4c51] text-white shadow-sm"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <aside className="sticky top-3 hidden h-[calc(100vh-24px)] min-h-0 flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_-32px_rgba(15,23,42,0.45)] lg:flex">
        {renderSidebarContent()}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={() => {
              setMobileOpen(false);
              window.requestAnimationFrame(() => menuButtonRef.current?.focus());
            }}
            aria-label="Đóng điều hướng"
          />
          <aside id="cv-editor-mobile-navigation" ref={drawerRef} role="dialog" aria-modal="true" aria-label="Điều hướng CV Studio" className="relative flex h-full w-[min(86vw,320px)] flex-col overflow-hidden bg-white shadow-2xl">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      <div aria-hidden={mobileOpen ? true : undefined} inert={mobileOpen ? true : undefined} className="min-w-0">{children}</div>
    </div>
  );
}
