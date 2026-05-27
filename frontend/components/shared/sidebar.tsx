"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Ticket, Package, Wrench,
  Calendar, History, ClipboardList, LogOut, ChevronRight, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { Role } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: "Dashboard",  href: "/admin",                icon: LayoutDashboard },
  { label: "Técnicos",   href: "/admin/technicians",    icon: Users           },
  { label: "Clientes",   href: "/admin/clients",        icon: Building2       },
  { label: "Tickets",    href: "/admin/tickets",        icon: Ticket          },
  { label: "Reportes",   href: "/admin/reports",        icon: FileText        },
  { label: "Inventario", href: "/admin/inventory",      icon: Package         },
  { label: "Productos",  href: "/admin/products",       icon: Wrench          },
  { label: "Visitas",    href: "/admin/visits",         icon: Calendar        },
];

const techNav: NavItem[] = [
  { label: "Mis Tickets", href: "/tech", icon: ClipboardList },
];

const clientNav: NavItem[] = [
  { label: "Dashboard",      href: "/client",          icon: LayoutDashboard },
  { label: "Agendar Visita", href: "/client/schedule", icon: Calendar        },
  { label: "Historial",      href: "/client/history",  icon: History         },
];

const navByRole: Record<Role, NavItem[]> = {
  ADMIN:       adminNav,
  TECHNICIAN:  techNav,
  CLIENT_USER: clientNav,
};

const roleLabel: Record<Role, string> = {
  ADMIN:       "Administrador",
  TECHNICIAN:  "Técnico",
  CLIENT_USER: "Cliente",
};

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const nav = navByRole[user.role];

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  return (
    <aside className="flex flex-col h-full w-64 p-4 gap-2 flex-shrink-0 bg-slate-900 text-slate-100">
      {/* Logo + user info */}
      <div className="px-2 pt-2 pb-4 mb-1 border-b border-slate-700">
        <Image
          src="/logo.png"
          alt="deployr"
          width={110}
          height={44}
          className="object-contain object-left mb-4"
        />
        <p className="font-bold text-sm text-white truncate">{user.name}</p>
        <span className="text-xs text-slate-400 capitalize">{roleLabel[user.role]}</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 pt-1">
        {nav.map((item) => {
          const roots = ["/admin", "/tech", "/client"];
          const isRoot = roots.includes(item.href);
          const active = isRoot
            ? pathname === item.href
            : pathname.startsWith(item.href);

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
              {active && <ChevronRight className="ml-auto h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-700 pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
