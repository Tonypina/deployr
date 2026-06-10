"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Clock, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { AppShell } from "@/components/shared/app-shell";
import { getSubscription } from "@/lib/services/billing";
import { Subscription } from "@/lib/types";

function daysRemaining(date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) { router.replace("/login"); return; }
    if (user.mustChangePassword) { router.replace("/change-password"); return; }
    if (user.onboardingCompleted === false && pathname !== "/onboarding") {
      router.replace("/onboarding");
      return;
    }
  }, [user, isLoading, router, pathname]);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      getSubscription().then(setSub).catch(() => {});
    }
  }, [user]);

  if (isLoading || !user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") || user.mustChangePassword) return null;
  if (user.onboardingCompleted === false && pathname !== "/onboarding") return null;

  const trialDays = daysRemaining(sub?.trialEndsAt);
  const showBanner = !bannerDismissed && sub?.status === "TRIALING" && trialDays !== null && trialDays <= 7;

  if (pathname === "/onboarding") return <>{children}</>;

  return (
    <AppShell>
      {showBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-secondary/10 border-b border-secondary/20 text-sm text-secondary">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {trialDays === 0
                ? "Tu periodo de prueba terminó hoy."
                : `${trialDays} día${trialDays !== 1 ? "s" : ""} restante${trialDays !== 1 ? "s" : ""} de prueba.`}
              {" "}
              <Link href="/admin/billing" className="font-semibold underline underline-offset-2 hover:opacity-80">
                Activar plan →
              </Link>
            </span>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="shrink-0 hover:opacity-60 transition-opacity">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {children}
    </AppShell>
  );
}
