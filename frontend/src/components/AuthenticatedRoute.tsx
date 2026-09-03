'use client';

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { readAuthUser, subscribeAuthUserChange } from "../utils/auth";

type AuthStatus = "checking" | "authenticated" | "redirecting";

export default function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let active = true;
    const syncSession = () => {
      if (!active) return;
      if (readAuthUser()) {
        setStatus("authenticated");
        return;
      }

      setStatus("redirecting");
      const returnPath = `${pathname}${window.location.search}`;
      router.replace(`/dang-nhap?next=${encodeURIComponent(returnPath)}`);
    };

    syncSession();
    const unsubscribe = subscribeAuthUserChange(syncSession);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [pathname, router]);

  if (status !== "authenticated") {
    return (
      <section role="status" aria-live="polite" className="mx-auto max-w-5xl space-y-4" aria-label="Đang xác thực tài khoản">
        <div className="h-40 animate-pulse rounded-[28px] bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-36 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <p className="sr-only">{status === "redirecting" ? "Đang chuyển đến trang đăng nhập" : "Đang kiểm tra phiên đăng nhập"}</p>
      </section>
    );
  }

  return children;
}
