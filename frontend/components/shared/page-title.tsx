"use client";

import { usePathname } from "next/navigation";
import { routeTitle, usePageTitleStore } from "@/lib/page-title";

export function PageTitle() {
  const override = usePageTitleStore((s) => s.title);
  const pathname = usePathname();
  const title = override || routeTitle(pathname);

  if (!title) return null;
  return (
    <h1 className="min-w-0 truncate text-base font-semibold tracking-tight">
      {title}
    </h1>
  );
}
