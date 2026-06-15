"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Building2, Ticket, Package,
  History, ClipboardList, LogOut, FileText, Plus, MapPin, FileCheck, Settings, CreditCard,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Role } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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
];

const superAdminNav: NavItem[] = [
  ...adminNav,
  { label: "Mi Empresa",   href: "/admin/company",  icon: Settings    },
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
  SUPER_ADMIN: superAdminNav,
  TECHNICIAN:  techNav,
  CLIENT_USER: clientNav,
};

const roleLabel: Record<Role, string> = {
  ADMIN:       "Administrador",
  SUPER_ADMIN: "Super Admin",
  TECHNICIAN:  "Técnico",
  CLIENT_USER: "Cliente",
};

const PLANS_WITH_POLICIES = new Set<string>(["PROFESIONAL", "EMPRESARIAL"]);

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  if (!user) return null;

  const allowPolicies = !user.plan || PLANS_WITH_POLICIES.has(user.plan);
  const nav = navByRole[user.role].filter((item) =>
    item.href !== "/admin/policies" || allowPolicies
  );

  function handleLogout() {
    clearAuth();
    router.replace("/login");
  }

  const roots = ["/admin", "/tech", "/client"];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="h-14 justify-center px-4">
        <Image
          src="/logo.png"
          alt="deployr"
          width={110}
          height={44}
          className="object-contain object-left group-data-[collapsible=icon]:hidden"
        />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const isRoot = roots.includes(item.href);
                const active = isRoot
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="group-data-[collapsible=icon]:!p-0"
              tooltip={user.name}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-full bg-primary/20 border border-sidebar-border text-xs font-bold text-primary shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{roleLabel[user.role]}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Cerrar sesión"
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
