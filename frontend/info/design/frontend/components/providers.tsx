"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
