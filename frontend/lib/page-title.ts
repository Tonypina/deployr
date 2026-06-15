import { useEffect } from "react";
import { create } from "zustand";

interface PageTitleState {
  /** Override set by a page via usePageTitle() — used for dynamic titles. */
  title: string;
  setTitle: (title: string) => void;
}

export const usePageTitleStore = create<PageTitleState>((set) => ({
  title: "",
  setTitle: (title) => set({ title }),
}));

// Static route → title. Dynamic ([id]) routes set their title via usePageTitle().
const ROUTE_TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/technicians": "Gestión de Técnicos",
  "/admin/clients": "Clientes",
  "/admin/clients/new": "Nuevo cliente",
  "/admin/company": "Perfil de la empresa",
  "/admin/inventory": "Inventario",
  "/admin/policies": "Pólizas",
  "/admin/policies/new": "Nueva póliza",
  "/admin/products": "Productos / Servicios",
  "/admin/reports": "Plantillas de reporte",
  "/admin/reports/new": "Nueva plantilla",
  "/admin/tickets": "Tickets",
  "/admin/tickets/new": "Nuevo ticket",
  "/admin/billing": "Suscripción",
  "/admin/billing/checkout": "Confirmar plan",
  "/admin/billing/success": "Suscripción activada",
  "/tech": "Panel del técnico",
  "/tech/history": "Historial de tickets",
  "/client": "Panel de Servicio",
  "/client/branches": "Mis Sucursales",
  "/client/history": "Historial de servicios",
  "/client/policies": "Mis Pólizas",
  "/client/tickets/new": "Solicitar servicio",
};

/** Resolves the static title for a route, including ticket-detail patterns. */
export function routeTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (/^\/(admin|tech|client)\/tickets\/[^/]+$/.test(pathname)) return "Ticket";
  return "";
}

/**
 * Registers a dynamic page title (e.g. a client or policy name) so it renders
 * in the AppShell header. Clears on unmount so the static route title applies
 * to the next page. Static pages don't need this — see ROUTE_TITLES above.
 */
export function usePageTitle(title: string) {
  const setTitle = usePageTitleStore((s) => s.setTitle);
  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);
}
