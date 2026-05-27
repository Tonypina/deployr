# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project overview

**deployr** ("Dispatch. Done Better.") is a maintenance service management platform. Companies register, manage technicians and clients, assign service tickets, and track inventory. Clients get a self-service portal to schedule visits and review service history. Technicians get a focused view to follow their assigned tickets and submit reports.

Two independently deployable projects, both targeting Vercel:

| Project | Path | Runtime |
|---|---|---|
| API | `backend/` | Node.js + Express, `@vercel/node` |
| Web app | `frontend/` | Next.js 15 App Router |

---

## Commands

### Backend (`backend/`)

```bash
npm run dev          # ts-node-dev with hot reload → http://localhost:4000
npm run build        # tsc → dist/
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:migrate   # create and apply a named migration
npm run db:push      # push schema to DB without a migration (dev/prototyping)
npm run db:studio    # open Prisma Studio
```

### Frontend (`frontend/`)

```bash
npm run dev    # Next.js dev server → http://localhost:3000
npm run build  # production build
npm run lint   # ESLint
npx tsc --noEmit  # type-check without emitting (no test runner configured)
```

### Environment setup

Copy `.env.example` → `.env` in each project before running.

Backend requires three secrets — generate them with Node:
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# ENCRYPTION_KEY (must be exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Frontend only needs `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:4000`).

---

## Architecture

### Authentication flow

1. On login/register, the backend returns `{ token, user }`.
2. The frontend stores `token` in `localStorage` and `user` as JSON in `localStorage`.
3. A `mp_token` cookie (max-age 24h) is written client-side by `lib/auth-store.ts` so Next.js middleware can verify auth server-side without reading localStorage.
4. All API calls attach `Authorization: Bearer <token>` via `lib/api-client.ts`.
5. On 401, the API client clears localStorage and redirects to `/login`.

### Role system

Three roles: `ADMIN`, `TECHNICIAN`, `CLIENT_USER`. JWT payload always carries `role`, `companyId`, and optionally `clientId`.

**Backend** enforces roles with composable middleware (`authenticate`, `requireAdmin`, `requireAdminOrTech`, etc.) from `src/middleware/auth.ts`. Most routes scope queries by `companyId` or `clientId` from `req.user` — never from the request body.

**Frontend** has three route groups, each with its own layout that guards by role and redirects to `/login` if the role doesn't match:
- `app/(admin)/` → `ADMIN`
- `app/(tech)/` → `TECHNICIAN`
- `app/(client)/` → `CLIENT_USER`

### Client data encryption

Sensitive `Client` fields (`contactEmail`, `contactPhone`, `taxId`, `address`) are stored AES-256-GCM encrypted in the database. The format stored is `ivHex:authTagHex:ciphertextHex`. All encrypt/decrypt logic lives in `src/utils/encryption.ts`. Every client route decrypts before returning data and encrypts before writing. Never return raw ciphertext to the frontend.

### Backend route conventions

- All routes follow `async (req, res, next) => { try { ... } catch (err) { next(err); } }`.
- Throw `new Error("NOT_FOUND")`, `"FORBIDDEN"`, or `"CONFLICT")` to trigger standard HTTP responses from the central error handler (`src/middleware/error.ts`).
- Validation is done with Zod at the top of each route handler via `.parse(req.body)` — Zod errors are automatically caught and returned as 422 with field-level messages.
- Pagination uses the `paginate()` helper from `src/types/index.ts` (max 100 per page).
- Nested resource routes use `mergeParams: true` (e.g. `branches` is mounted at `/api/clients/:clientId/branches` and reads `req.params.clientId`).

### Frontend data conventions

- `lib/api-client.ts` exports `api.get/post/put/patch/del` — all typed with generics, all throw on `success: false`.
- `lib/types.ts` is the single source of truth for shared TypeScript types. These mirror the Prisma schema but are plain interfaces, not Prisma types.
- `lib/utils.ts` exports `statusLabel`, `statusColor`, `priorityLabel`, `priorityColor`, `visitStatusLabel`, and `formatDate` — use these everywhere status/priority values are displayed.
- Auth state lives in `lib/auth-store.ts` (Zustand). Call `hydrate()` on mount in any layout that needs user data. The root `app/page.tsx` redirects based on role after hydration.

### Database schema relationships

```
Company
  ├── User[]          (ADMIN and TECHNICIAN users)
  ├── Product[]       (company's serviceable products)
  ├── Client[]        (customer companies — PII encrypted)
  │     ├── Branch[]  (client locations)
  │     │     └── Equipment[]  (machines at each branch, optionally linked to a Product)
  │     └── User[]    (CLIENT_USER portal accounts)
  ├── Ticket[]        (service tickets — scoped to company + client)
  │     └── TicketReport (1:1, created by technician, auto-closes ticket)
  ├── ScheduledVisit[] (client-initiated visit requests)
  └── InventoryItem[]
```

All IDs are cuid2 strings. `onDelete: Cascade` flows down from Company → everything beneath it.

### Vercel deployment

- **Backend**: `vercel.json` routes all traffic to `src/server.ts` via `@vercel/node`. The Express app runs as a single serverless function.
- **Frontend**: standard Next.js deployment; no `output: 'export'` (SSR required for middleware auth).
- Both projects deploy independently — set `NEXT_PUBLIC_API_URL` in the frontend Vercel project to the backend's Vercel URL.

### Brand / styling

- CSS custom properties in `app/globals.css` drive the color system. Primary is blue `hsl(221.2 83.2% 53.3%)`. Sidebar uses `bg-slate-900` / Tailwind slate utilities. Auth uses the centered `auth-shell` + `auth-card` pattern.
- `app/globals.css` also defines layout utility classes: `page-stack`, `page-header`, `stats-grid`, `list-rows`, `card-content-tight`, `auth-shell`, `auth-card`, `auth-body`, `auth-footer`, `meta-sep`, `font-display`. Use these on every new page.
- Fonts: Inter (body, CSS variable `--font-sans`), Saira Condensed (display headings, CSS variable `--font-display`) — loaded via `next/font/google` in `app/layout.tsx`.
- Status pills: `statusColor` in `lib/utils.ts` returns Tailwind bg/text classes matching the design system (`bg-blue-100 text-blue-800` for OPEN, etc.). Always use `cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[t.status])`.
- Logo lives at `public/logo.png` and is used via `next/image`.
- UI components in `components/ui/` are hand-written shadcn/ui primitives (not generated by the CLI). Add new ones following the same pattern.
