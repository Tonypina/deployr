"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";

export default function RootPage() {
  const router = useRouter();
  const { user, isLoading, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace("/login"); return; }
    if (user.role === "ADMIN") router.replace("/admin");
    else if (user.role === "TECHNICIAN") router.replace("/tech");
    else router.replace("/client");
  }, [user, isLoading, router]);

  return null;
}
