"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Ticket, Package,
  History, ClipboardList, LogOut, FileText, Plus, MapPin, FileCheck, Settings, CreditCard,
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
  { label: "Pólizas",   href: "/admin/policies",       icon: FileCheck       },
  { label: "Reportes",   href: "/admin/reports",        icon: FileText        },
  { label: "Inventario", href: "/admin/inventory",      icon: Package         },
  { label: "Mi Empresa",    href: "/admin/company",  icon: Settings    },
  { label: "Suscripción",  href: "/admin/billing",  icon: CreditCard  },
];

const techNav: NavItem[] = [
  { label: "Mis Tickets", href: "/tech",         icon: ClipboardList },
  { label: "Historial",   href: "/tech/history", icon: History       },
];

const clientNav: NavItem[] = [
  { label: "Dashboard",          href: "/client",              icon: LayoutDashboard },
  { label: "Solicitar Servicio", href: "/client/tickets/new",  icon: Plus            },
  { label: "Mis Sucursales",     href: "/client/branches",     icon: MapPin          },
  { label: "Mis Pólizas",       href: "/client/policies",     icon: FileCheck       },
  { label: "Historial",          href: "/client/history",      icon: History         },
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const nav = navByRole[user.role];

  function handleLogout() {
    onClose?.();
    clearAuth();
    router.replace("/login");
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={cn(
        "flex flex-col w-[240px] flex-shrink-0",
        "bg-surface border-r border-outline-variant",
        "fixed inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out",
        "md:relative md:inset-auto md:z-auto md:translate-x-0 md:transition-none",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}>
        {/* Logo */}
        <div className="px-6 pt-6 pb-8 border-b border-outline-variant/50">
          <Image
            src="/logo.png"
            alt="deployr"
            width={110}
            height={44}
            className="object-contain object-left mb-2"
          />
          <p className="font-label-caps text-on-surface-variant">Maintenance Ops</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 pt-3 space-y-0.5 overflow-y-auto">
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
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-primary bg-primary/10 border-r-2 border-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        <div className="mt-auto border-t border-outline-variant/50 p-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-outline-variant flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">{user.name}</p>
              <p className="font-label-caps text-on-surface-variant truncate">{roleLabel[user.role]}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}
