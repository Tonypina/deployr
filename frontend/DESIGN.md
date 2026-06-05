# DESIGN.md — deployr Frontend

Design reference for the deployr web application. All design decisions target **dark mode only**; the application enforces `color-scheme: dark` globally.

---

## Color System

Tokens are defined as CSS custom properties in `app/globals.css` and mapped into Tailwind via `tailwind.config.ts`. They follow the **Material Design 3** surface/container hierarchy.

### Shadcn/ui Base Tokens

| Token | HSL Value | Hex | Purpose |
|---|---|---|---|
| `--background` | 0 0% 7.5% | `#131313` | Page background |
| `--foreground` | 15 9% 89% | `#e5e2e1` | Default text |
| `--card` | 0 0% 11.8% | `#1e1e1e` | Card backgrounds |
| `--card-foreground` | 15 9% 89% | `#e5e2e1` | Text on cards |
| `--popover` | 0 0% 9.4% | `#181818` | Dropdown/popover backgrounds |
| `--primary` | 220 100% 84% | `#adc6ff` | Primary action color, focus rings |
| `--primary-foreground` | 216 100% 21% | `#002e69` | Text on primary |
| `--secondary` | 36 100% 78% | `#ffcf8f` | Amber accent |
| `--secondary-foreground` | 37 100% 14% | — | Text on secondary |
| `--muted` | 0 0% 12.4% | `#201f1f` | Muted surfaces |
| `--muted-foreground` | 228 20% 80% | `#c1c6d7` | Muted/placeholder text |
| `--accent` | 0 1% 21% | `#353534` | Highest surface container |
| `--border` | 225 13% 29% | `#414755` | Default borders |
| `--input` | 225 13% 29% | `#414755` | Input borders |
| `--ring` | 220 100% 84% | `#adc6ff` | Focus ring |
| `--radius` | — | — | 0.75rem base border radius |
| `--destructive` | 6 100% 84% | `#ffb4ab` | Error/danger |

### Surface Container Scale (MD3)

Used directly as Tailwind classes (`bg-surface-container-low`, etc.):

| Token | Hex | Usage |
|---|---|---|
| `surface` | `#131313` | Page bg |
| `surface-bright` | `#393939` | Elevated surfaces |
| `surface-variant` | `#353534` | Chip/tag backgrounds |
| `surface-container-lowest` | `#0e0e0e` | Deepest well |
| `surface-container-low` | `#1c1b1b` | Table headers |
| `surface-container` | `#201f1f` | Default card fill |
| `surface-container-high` | `#2a2a2a` | Raised cards |
| `surface-container-highest` | `#353534` | Top elevation, progress track |
| `on-surface` | `#e5e2e1` | Primary text |
| `on-surface-variant` | `#c1c6d7` | Secondary/label text |
| `outline-variant` | `#414755` | Thin dividers, input borders |

### Brand Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `primary` (`--primary`) | `#adc6ff` | Primary actions, focus, highlights |
| `primary-container` | `#4b8eff` | Stronger primary fill |
| `tertiary` | `#3ce36a` | Success/active indicators |
| `tertiary-container` | `#00a744` | Success fill |
| `secondary-container` / `amber-accent` | `#ffcf8f` / `#feaa00` | Amber/warning accent |

---

## Typography

### Font Families

| Variable | Font | Role |
|---|---|---|
| `--font-sans` | Inter | Body text, UI labels, form inputs |
| `--font-mono` | JetBrains Mono | Status labels, caps labels, data values |
| `--font-display` | Saira Condensed | Display headings, hero text |

Fonts are loaded via `next/font/google` in `app/layout.tsx` and injected as CSS variables on `<body>`.

### Typography Utility Classes

```css
/* Display headings (Saira Condensed) */
.font-display {
  font-family: var(--font-display, "Saira Condensed", system-ui, sans-serif);
}

/* ALL-CAPS metadata labels — used for table headers, card section labels */
.font-label-caps {
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  line-height: 12px;
}

/* Large numeric stat values */
.font-stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 34px;
}

/* Inline metadata separator — renders " · " before the element */
.meta-sep::before {
  content: " · ";
}
```

---

## Spacing & Layout

### Custom Spacing Tokens

| Token | Value | Usage |
|---|---|---|
| `container-padding` | 24px | Outer page padding |
| `gutter` | 16px | Inner component gaps |
| `stack-sm` | 8px | Tight vertical stacks |
| `stack-md` | 16px | Standard vertical stacks |
| `section-gap` | 32px | Between major page sections |

### Page Layout Utility Classes

These classes are defined in `app/globals.css` and should be used on every new page:

```tsx
// Top-level page wrapper — adds vertical rhythm between direct children
<div className="page-stack">
  <div>...</div>  {/* each child gets mt-4 md:mt-6 from the sibling selector */}
</div>

// Page header row — title on left, actions on right
<div className="page-header">
  <div>
    <h1>Tickets</h1>
    <p className="text-sm text-muted-foreground">42 tickets en total</p>
  </div>
  <Button>Nuevo ticket</Button>
</div>

// Responsive stats grid — auto-fit columns, min 160px each
<div className="stats-grid">
  <StatsCard ... />
  <StatsCard ... />
</div>

// List with thin dividers between rows
<div className="list-rows">
  <div>Row 1</div>
  <div>Row 2</div>  {/* gets border-top + pt-3 mt-3 */}
</div>
```

### Surface & Glass Classes

```css
/* Primary card style — glassmorphic, hover glow */
.glass-card {
  background: rgba(30, 30, 30, 0.7);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.75rem;
  /* hover: border-color → rgba(173, 198, 255, 0.2) */
}

/* Inner top highlight for depth */
.inner-glow {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08);
}

/* Glass-style input field */
.glass-input {
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  /* focus: border #adc6ff, box-shadow 0 0 0 2px rgba(173, 198, 255, 0.2) */
}

/* Tight padding for card body sections */
.card-content-tight {
  padding: 1rem; /* p-4 */
}
```

---

## Auth Layout

Pages under `app/(auth)/` use a distinct layout with ambient background glows.

```css
/* Centered auth shell with radial gradient background */
.auth-shell {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: #131313 with radial-gradient(primary/6 at 20% 30%, tertiary/4 at 80% 70%);
}

/* Auth card — narrow, glass effect */
.auth-card       { width: 100%; max-width: 24rem; }
.auth-card-md    { max-width: 480px; }

/* Internal auth card sections */
.auth-header     { padding: 1.5rem 1.5rem 0; }
.auth-body       { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
.auth-footer     { padding: 0 1.5rem 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
```

---

## Components

All base components live in `components/ui/`. They are hand-written shadcn/ui-style primitives using `class-variance-authority` (cva) and `forwardRef`.

### Button

```tsx
import { Button } from "@/components/ui/button";

// Variants: default | destructive | outline | secondary | ghost | link
// Sizes: default (h-10 px-4) | sm (h-8 px-3) | lg (h-11 px-8) | icon (h-10 w-10)

<Button variant="default">Primary action</Button>
<Button variant="outline" size="sm">Secondary</Button>
<Button variant="ghost" size="icon"><PlusIcon /></Button>
```

All buttons have `active:scale-95`, focus-visible ring, and `disabled:opacity-40`.

### Card

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Subtitle</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
  <CardFooter>...</CardFooter>
</Card>
```

Card has `rounded-xl border border-border bg-card shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]`. `CardHeader` has `border-b border-border/50`.

### Input

```tsx
import { Input } from "@/components/ui/input";

<Input placeholder="Search..." />
```

`bg-[#181818]`, `border-border`, focus styles match `--ring`. Supports file inputs.

### Label

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>
```

### Badge

```tsx
import { Badge } from "@/components/ui/badge";

// Variants: default | secondary | destructive | outline
<Badge variant="secondary">Active</Badge>
```

### Pagination

```tsx
import { Pagination } from "@/components/ui/pagination";

<Pagination page={1} total={120} limit={20} onPage={(p) => setPage(p)} />
```

Renders Previous/Next buttons + "X–Y de TOTAL" + page indicator.

### Toast

Use the `useToast` hook; `Toaster` is mounted in `app/layout.tsx`.

```tsx
import { useToast } from "@/components/ui/use-toast";

const { toast } = useToast();
toast({ title: "Guardado", description: "Los cambios se guardaron correctamente." });
toast({ variant: "destructive", title: "Error", description: "Algo salió mal." });
```

### AddressAutocomplete

```tsx
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

<AddressAutocomplete
  value={address}
  onChange={setAddress}
  placeholder="Calle, ciudad, estado..."
/>
```

Debounced autocomplete (300ms) backed by `/api/maps/autocomplete`. Supports keyboard navigation and shows a check icon when an address is selected from the list.

### ImageLightbox

```tsx
import { ImageLightbox } from "@/components/ui/image-lightbox";

{open && <ImageLightbox src="/uploads/photo.jpg" onClose={() => setOpen(false)} />}
```

Fixed overlay, closes on Escape or backdrop click.

### BackgroundPaths

```tsx
import { BackgroundPaths } from "@/components/ui/background-paths";

<BackgroundPaths>
  <YourContent />
</BackgroundPaths>
```

Animated SVG decorative paths (Framer Motion). Used on landing/auth pages.

---

## Shared Components

### StatsCard

```tsx
import { StatsCard } from "@/components/shared/stats-card";

<StatsCard
  title="Tickets activos"
  value={42}
  description="+3 esta semana"
  icon={TicketIcon}
  color="text-primary"
  trend="+12%"
  progress={68}
  progressColor="bg-primary"
/>
```

Renders inside a `.stats-grid`. `progress` (0–100) shows a thin bar at the bottom.

---

## Status & Priority Pills

Always use the utility maps from `lib/utils.ts`. Never hard-code colors.

```tsx
import { cn } from "@/lib/utils";
import { statusColor, statusLabel, priorityColor, priorityLabel } from "@/lib/utils";

// Status pill
<span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>
  {statusLabel[ticket.status]}
</span>

// Priority pill
<span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", priorityColor[ticket.priority])}>
  {priorityLabel[ticket.priority]}
</span>
```

### Ticket Status Colors

| Status | Label | Classes |
|---|---|---|
| `PENDING` | Pendiente | `bg-yellow-500/15 text-yellow-300` |
| `ASSIGNED` | Asignado | `bg-blue-500/15 text-blue-300` |
| `ON_SITE` | En sitio | `bg-cyan-500/15 text-cyan-300` |
| `IN_PROGRESS` | En progreso | `bg-orange-500/15 text-orange-300` |
| `PENDING_REPORT` | Reporte pendiente | `bg-violet-500/15 text-violet-300` |
| `COMPLETED` | Completado | `bg-emerald-500/15 text-emerald-300` |
| `CLOSED` | Cerrado | `bg-white/10 text-white/50` |
| `CANCELLED` | Cancelado | `bg-white/8 text-white/40` |
| `EXPIRED` | Vencido | `bg-red-500/15 text-red-300` |
| `REVIEW` | En revisión | `bg-purple-500/15 text-purple-300` |
| `PENDING_APPROVAL` | Aprobación pendiente | `bg-amber-500/15 text-amber-300` |
| `REOPENED` | Reabierto | `bg-rose-500/15 text-rose-300` |

### Priority Colors

| Priority | Label | Classes |
|---|---|---|
| `LOW` | Baja | `bg-white/10 text-white/60` |
| `MEDIUM` | Media | `bg-blue-500/15 text-blue-300` |
| `HIGH` | Alta | `bg-orange-500/15 text-orange-300` |
| `URGENT` | Urgente | `bg-red-500/20 text-red-300` |

### Policy Status Colors

| Status | Label | Classes |
|---|---|---|
| `ACTIVE` | Activa | `bg-emerald-500/15 text-emerald-300` |
| `EXPIRED` | Vencida | `bg-white/10 text-white/50` |
| `CANCELLED` | Cancelada | `bg-red-500/15 text-red-300` |

### Recurrence Labels

| Value | Label |
|---|---|
| `MONTHLY` | Mensual |
| `BIMONTHLY` | Bimestral |
| `QUARTERLY` | Trimestral |
| `SEMIANNUAL` | Semestral |
| `ANNUAL` | Anual |

---

## Recurring Patterns

### Tables

```tsx
<div className="glass-card rounded-xl overflow-hidden">
  <table className="w-full">
    <thead className="bg-surface-container-low">
      <tr>
        <th className="font-label-caps text-on-surface-variant px-4 py-3 text-left border-b border-outline-variant/30">
          CLIENTE
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-outline-variant/10">
      <tr className="hover:bg-white/5 transition-colors">
        <td className="px-4 py-3">...</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Avatar Cells

Cycle through three color pairs to avoid monotony:

```tsx
const avatarColors = [
  "bg-primary/20 text-primary",
  "bg-amber-accent/20 text-amber-accent",
  "bg-tertiary/20 text-tertiary",
];

<div className={cn("h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold", avatarColors[index % 3])}>
  {initials}
</div>
```

### Progress / Load Bars

```tsx
<div className="bg-surface-container-highest h-1.5 rounded-full overflow-hidden">
  <div
    className="h-full rounded-full transition-all duration-500 bg-primary"
    style={{ width: `${percent}%` }}
  />
</div>
```

Color options: `bg-primary`, `bg-tertiary`, `bg-cyan-400`, `bg-violet-400`.

### Inline Metadata (meta-sep)

```tsx
<p className="text-xs text-muted-foreground">
  <span>{formatDate(ticket.createdAt)}</span>
  <span className="meta-sep">{ticket.branch.name}</span>
  <span className="meta-sep">{ticket.assignedTo.name}</span>
</p>
```

Renders as: `Jan 5, 2026, 3:00 PM · Sucursal Norte · Juan Pérez`

### Glass Card with Section Header

```tsx
<div className="glass-card rounded-xl overflow-hidden">
  <div className="px-6 py-5 border-b border-outline-variant flex items-center justify-between">
    <h3 className="font-semibold">Últimos tickets</h3>
    <Button variant="ghost" size="sm">Ver todos</Button>
  </div>
  <div className="px-6 py-4">
    {/* content */}
  </div>
</div>
```

### Info Label/Value Row

Used for detail panels and metadata sections:

```tsx
<div>
  <p className="font-label-caps text-on-surface-variant mb-1">TELÉFONO</p>
  <p className="text-sm text-on-surface">+52 55 1234 5678</p>
</div>
```

### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <TicketIcon className="h-10 w-10 text-muted-foreground mb-4" />
  <p className="text-sm text-muted-foreground mb-4">No hay tickets que mostrar</p>
  <Button variant="outline" size="sm">Crear ticket</Button>
</div>
```

### Pulsing Status Dot

```tsx
<span className="relative flex h-2 w-2">
  <span className="status-pulse absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
  <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
</span>
```

`.status-pulse` runs a scale+opacity keyframe loop (2s ease-in-out infinite).

---

## Utility Functions

All from `lib/utils.ts`:

```ts
import { cn, formatDate } from "@/lib/utils";

// Merge Tailwind classes safely (clsx + tailwind-merge)
cn("px-4 py-2", condition && "bg-primary", className)

// Format dates in es-MX locale with date + time
formatDate(new Date()) // → "5 jun. 2026, 3:00 p.m."
```

---

## Border Radius

| Token | Value |
|---|---|
| `rounded-sm` | `calc(0.75rem - 4px)` = 0.5rem |
| `rounded-md` | `calc(0.75rem - 2px)` = 0.625rem |
| `rounded-lg` | `0.75rem` |
| `rounded-xl` | `0.875rem` (Tailwind default) |

Use `rounded-xl` for cards, `rounded-lg` for inputs and buttons, `rounded-full` for pills and avatars.

---

## Localization

- All UI text is in **Spanish (es-MX)**.
- Status labels, priority labels, form placeholders, error messages, and button copy are all in Spanish.
- Dates use `Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" })` via `formatDate()`.

---

## Design Principles

1. **Dark mode only** — No light mode. `color-scheme: dark` is global.
2. **Glassmorphism depth** — Cards and inputs use `backdrop-filter: blur(24px)` with translucent borders to create depth without hard edges.
3. **Thin dividers** — Use `rgba(255,255,255,0.05)` borders and `divide-outline-variant/10` rather than full-opacity lines.
4. **Surface hierarchy** — Use the MD3 surface container scale to communicate elevation: `lowest` → `low` → default → `high` → `highest`.
5. **Monospace for data** — Use `.font-label-caps` for column headers and category labels; use `JetBrains Mono` for numeric values and short codes.
6. **Color-coded semantics** — Status and priority always use the utility maps. Never inline color classes for semantic states.
7. **Consistent avatars** — Always render initials in the 3-color cycle (`primary / amber-accent / tertiary`) so lists have visual variety.
8. **Lucide icons** — All icons are from `lucide-react`. Prefer `h-4 w-4` for inline and `h-5 w-5` for standalone.
9. **Logo** — `public/logo.png` via `next/image`. Do not substitute with text or SVG inline.
