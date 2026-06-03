"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { AppShell } from "@/components/shared/app-shell";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== "CLIENT_USER") { router.replace("/login"); return; }
    if (user.mustChangePassword) { router.replace("/change-password"); return; }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.mustChangePassword) return null;

  return <AppShell>{children}</AppShell>;
}
