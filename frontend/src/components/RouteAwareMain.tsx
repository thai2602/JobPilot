'use client';

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isCvEditorRoute } from "../utils/routes";

export default function RouteAwareMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const editorWorkspace = isCvEditorRoute(pathname);

  return (
    <main className={editorWorkspace
      ? "w-full max-w-none flex-grow p-0"
      : "mx-auto w-full max-w-[1200px] flex-grow px-4 py-8 md:px-6 md:py-14"
    }>
      {children}
    </main>
  );
}
