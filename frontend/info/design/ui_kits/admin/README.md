# deployr Admin UI kit

The multi-tenant company operator's console. The admin runs the whole show — manages technicians, clients, tickets, inventory, products, and the visit-request queue.

## Files

- `index.html` — interactive shell. Sidebar on the left, content on the right; click any nav item to jump pages.
- `Dashboard.jsx` — KPI tiles + "Últimos tickets" and "Inventario bajo stock" cards.
- `Tickets.jsx` — list + status filter chips + page-header CTA.
- `Inventory.jsx` — inline +/- adjuster + low-stock destructive-border treatment + inline create form.
- `Visits.jsx` — moderation queue with Confirmar / Cancelar actions on PENDING rows.
- `Technicians.jsx` — list with activate / deactivate toggle + inline create form.

Other pages (Clientes, Productos) live inline in `index.html` since they're variations on the same list-card pattern.

## Sources

Each component is a near-verbatim visual port of its Next.js counterpart:

| Kit file | Codebase source |
|---|---|
| `Dashboard.jsx` | `frontend/app/(admin)/admin/page.tsx` |
| `Tickets.jsx` | `frontend/app/(admin)/admin/tickets/page.tsx` |
| `Inventory.jsx` | `frontend/app/(admin)/admin/inventory/page.tsx` |
| `Visits.jsx` | `frontend/app/(admin)/admin/visits/page.tsx` |
| `Technicians.jsx` | `frontend/app/(admin)/admin/technicians/page.tsx` |

Shared chrome (`<Sidebar>`, `<StatsCard>`, `<PageHeader>`, status / priority pills) lives in `../_shared/`.

## Patterns demonstrated

- **App shell:** `flex h-screen overflow-hidden` with `<Sidebar w-64>` + `<main className="flex-1 overflow-y-auto bg-slate-50 p-6">`. Only `<main>` scrolls.
- **Page rhythm:** `space-y-6` between sections.
- **Page header pattern:** H1 + 14px muted subtitle on the left, primary `+ Nuevo …` button on the right, in a flex justify-between.
- **Filter chip row:** active = `btn-primary`, idle = `btn-outline`, all `size="sm"`. Sits below the page header.
- **List cards:** `card-content-tight` (= `p-4`) instead of the default `p-6` for dense rows. Hover ⇒ `shadow-md`.
- **Pill clusters:** Status + Priority side-by-side on the top-left of each ticket card.
- **Toasts:** appear bottom-right, success default / destructive variant.

## What's not real

- All data is mocked from `_shared/sample-data.jsx`. Mutations are local React state.
- "Ver" on a ticket fires a toast instead of routing to the detail page.
