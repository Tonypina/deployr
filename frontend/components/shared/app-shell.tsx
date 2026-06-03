"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Mobile top bar — hidden on md+ */}
        <div className="flex items-center gap-3 px-4 h-14 bg-surface border-b border-outline-variant shrink-0 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Image
            src="/logo.png"
            alt="deployr"
            width={80}
            height={32}
            className="object-contain object-left"
          />
        </div>
        <main className="flex-1 overflow-y-auto bg-surface p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
