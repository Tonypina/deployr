"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Ticket, Package, Wrench,
  Calendar, History, ClipboardList, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { Role } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Técnicos", href: "/admin/technicians", icon: Users },
  { label: "Clientes", href: "/admin/clients", icon: Building2 },
  { label: "Tickets", href: "/admin/tickets", icon: Ticket },
  { label: "Inventario", href: "/admin/inventory", icon: Package },
  { label: "Productos", href: "/admin/products", icon: Wrench },
  { label: "Visitas", href: "/admin/visits", icon: Calendar },
];

const techNav: NavItem[] = [
  { label: "Mis Tickets", href: "/tech", icon: ClipboardList },
];

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/client", icon: LayoutDashboard },
  { label: "Agendar Visita", href: "/client/schedule", icon: Calendar },
  { label: "Historial", href: "/client/history", icon: History },
];

const navByRole: Record<Role, NavItem[]> = {
  ADMIN: adminNav,
  TECHNICIAN: techNav,
  CLIENT_USER: clientNav,
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const nav = navByRole[user.role];

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <aside className="flex flex-col h-full w-64 bg-slate-900 text-slate-100 p-4 gap-2">
      <div className="px-2 py-4 mb-2">
        <p className="text-xs text-slate-400 uppercase tracking-widest">Maintenance</p>
        <p className="font-bold text-lg truncate">{user.name}</p>
        <p className="text-xs text-slate-400 capitalize">{user.role.replace("_", " ").toLowerCase()}</p>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/tech" && item.href !== "/client" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-700 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {active && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="justify-start gap-3 text-slate-300 hover:text-white hover:bg-slate-800"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </aside>
  );
}
