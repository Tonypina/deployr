# deployr — Dispatch. Done Better.

A maintenance service management platform for companies that manage technicians, clients, and service tickets. Admins manage the full operation; technicians follow their assigned work; clients self-schedule visits and review service history.

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Node.js, Express, TypeScript |
| Web app | Next.js 15 (App Router), React 19, TypeScript |
| Database | PostgreSQL (Neon), Prisma ORM |
| Auth | JWT, bcryptjs |
| Payments | Stripe (Checkout Sessions, webhooks) |
| File storage | Vercel Blob |
| Email | Nodemailer (SMTP) |
| Maps | Google Maps Places API (server-side proxy) |
| Deployment | Vercel (both projects) |

---

## Repository Structure

Two independently deployable projects in a monorepo:

```
deployr/
├── backend/        Node.js + Express API  → http://localhost:4000
└── frontend/       Next.js 15 web app     → http://localhost:3000
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon recommended)
- Stripe account (test mode is fine for local dev)

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` in each project:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Then fill in the values — see [Environment Variables](#environment-variables) below.

### 3. Set up the database

```bash
cd backend
npm run db:migrate   # apply all migrations
# or for fast prototyping:
npm run db:push      # push schema without a migration file
```

### 4. Run in development

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Backend: `http://localhost:4000` — Frontend: `http://localhost:3000`

To expose the frontend on your LAN (useful for mobile testing):

```bash
cd frontend && npm run dev:lan
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. Neon) |
| `JWT_SECRET` | Random 64-byte hex string — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Token TTL, e.g. `24h` |
| `ENCRYPTION_KEY` | AES-256 key — exactly 64 hex chars (32 bytes) — `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins, e.g. `http://localhost:3000,https://deployr.mx` |
| `DEPLOYR_BLOB_READ_WRITE_TOKEN` | Vercel Blob token — Storage → your blob store → `.env.local` tab |
| `PORT` | API port (default `4000`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Used in email links, e.g. `https://deployr.mx` |
| `GOOGLE_MAPS_KEY` | Google Maps Places API key for address autocomplete proxy |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (e.g. `587`) |
| `SMTP_SECURE` | `true` for port 465, `false` otherwise |
| `SMTP_USER` | SMTP login |
| `SMTP_PASS` | SMTP password or app password |
| `SMTP_FROM` | From address, e.g. `deployr <no-reply@deployr.mx>` |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_BASICO_MONTHLY` | Stripe Price ID for Básico monthly |
| `STRIPE_PRICE_BASICO_ANNUAL` | Stripe Price ID for Básico annual |
| `STRIPE_PRICE_INICIADOR_MONTHLY` | Stripe Price ID for Iniciador monthly |
| `STRIPE_PRICE_INICIADOR_ANNUAL` | Stripe Price ID for Iniciador annual |
| `STRIPE_PRICE_PROFESIONAL_MONTHLY` | Stripe Price ID for Profesional monthly |
| `STRIPE_PRICE_PROFESIONAL_ANNUAL` | Stripe Price ID for Profesional annual |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default `http://localhost:4000`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_...` or `pk_live_...`) |

---

## Backend Commands

```bash
npm run dev          # ts-node-dev with hot reload → http://localhost:4000
npm run build        # tsc → dist/
npm run start        # run compiled output
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:migrate   # create and apply a named migration
npm run db:push      # push schema to DB without a migration (prototyping)
npm run db:studio    # open Prisma Studio
npm run db:seed      # run prisma/seed.ts
```

## Frontend Commands

```bash
npm run dev          # Next.js dev server → http://localhost:3000
npm run dev:lan      # dev server exposed on 0.0.0.0 (LAN access)
npm run build        # production build
npm run lint         # ESLint
npx tsc --noEmit     # type-check without emitting
```

---

## Architecture

### Authentication Flow

1. Login/register returns `{ token, user }` from the API.
2. The frontend stores `token` and `user` in `localStorage`.
3. A `mp_token` cookie (max-age 24h) is written client-side by `lib/auth-store.ts` so Next.js middleware can verify auth server-side.
4. All API calls attach `Authorization: Bearer <token>` via `lib/api-client.ts`.
5. On 401, the client clears localStorage and redirects to `/login`.

### Role System

Three roles: `ADMIN`, `TECHNICIAN`, `CLIENT_USER`. The JWT payload always carries `role`, `companyId`, and optionally `clientId`.

**Backend** enforces roles with composable middleware from `src/middleware/auth.ts` (`authenticate`, `requireAdmin`, `requireAdminOrTech`, etc.). Most routes scope all queries by `companyId` or `clientId` from `req.user` — never from the request body.

**Frontend** uses three route groups, each with a layout that guards by role and redirects to `/login` if it doesn't match:

| Route group | Role |
|---|---|
| `app/(admin)/` | `ADMIN` |
| `app/(tech)/` | `TECHNICIAN` |
| `app/(client)/` | `CLIENT_USER` |

### Subscription Gate

All API routes except `/api/auth`, `/api/billing`, `/api/plans`, `/api/webhooks`, and `/api/health` require both a valid JWT **and** an active or trialing Stripe subscription. The gate runs via middleware in `src/app.ts`.

### Client Data Encryption

Sensitive `Client` fields — `contactEmail`, `contactPhone`, `taxId`, `address` — are stored AES-256-GCM encrypted in the database as `ivHex:authTagHex:ciphertextHex`. All encrypt/decrypt logic lives in `src/utils/encryption.ts`. Every client route decrypts before returning data and encrypts before writing.

---

## API Routes

| Prefix | Resource |
|---|---|
| `GET /api/health` | Health check |
| `/api/auth` | Login, register, password reset |
| `/api/users` | User management (ADMIN) |
| `/api/clients` | Client companies (ADMIN) |
| `/api/clients/:clientId/branches` | Client branches |
| `/api/clients/:clientId/branches/:branchId/equipment` | Equipment at a branch |
| `/api/products` | Serviceable products catalog |
| `/api/tickets` | Service tickets |
| `/api/tickets/:ticketId/report` | Technician reports (1:1 with ticket) |
| `/api/inventory` | Inventory items |
| `/api/report-templates` | Reusable report templates |
| `/api/upload` | File uploads to Vercel Blob |
| `/api/policies` | Service policies |
| `/api/company` | Company profile |
| `/api/maps` | Google Maps Places autocomplete proxy |
| `/api/billing` | Stripe billing (Checkout Sessions, portal) |
| `/api/plans` | Public plan listing |
| `/api/webhooks` | Stripe webhook receiver |

### Backend Conventions

- All route handlers follow `async (req, res, next) => { try { ... } catch (err) { next(err); } }`.
- Throw `new Error("NOT_FOUND")`, `"FORBIDDEN"`, or `"CONFLICT"` to trigger standard HTTP error responses from the central error handler (`src/middleware/error.ts`).
- Validation uses Zod at the top of each handler via `.parse(req.body)` — Zod errors are caught and returned as 422 with field-level messages.
- Pagination uses the `paginate()` helper from `src/types/index.ts` (max 100 per page).
- Nested resource routes use `mergeParams: true`.

---

## Database Schema

All IDs are cuid2 strings. `onDelete: Cascade` flows down from `Company` → everything beneath it.

```
Company
  ├── User[]           ADMIN and TECHNICIAN accounts
  ├── Product[]        Company's catalog of serviceable products
  ├── Client[]         Customer companies (PII fields encrypted at rest)
  │     ├── Branch[]   Customer locations
  │     │     └── Equipment[]   Machines at each branch (optionally linked to a Product)
  │     └── User[]     CLIENT_USER portal accounts
  ├── Ticket[]         Service tickets (scoped to company + client)
  │     └── TicketReport   1:1 technician report, auto-closes ticket on creation
  ├── ScheduledVisit[] Client-initiated visit requests
  └── InventoryItem[]
```

---

## Frontend Architecture

### Data Layer

- `lib/api-client.ts` — exports `api.get/post/put/patch/del`, all typed with generics, all throw on `success: false`.
- `lib/types.ts` — single source of truth for TypeScript interfaces (mirrors Prisma schema, no Prisma types).
- `lib/auth-store.ts` — Zustand store for auth state. Call `hydrate()` on mount in any layout that needs user data.
- `lib/utils.ts` — `cn()`, `formatDate()`, and all status/priority/policy label and color maps.

### Status & Priority Utilities

Always use the maps from `lib/utils.ts` — never hard-code colors for semantic states:

```tsx
import { cn, statusColor, statusLabel, priorityColor, priorityLabel } from "@/lib/utils";

<span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", statusColor[ticket.status])}>
  {statusLabel[ticket.status]}
</span>
```

### UI Components

Base components in `components/ui/` are hand-written shadcn/ui-style primitives. See `frontend/DESIGN.md` for the full design system reference including color tokens, typography, layout classes, component APIs, and pattern examples.

---

## Deployment

Both projects deploy independently to Vercel.

### Backend

`backend/vercel.json` routes all traffic to `src/server.ts` via `@vercel/node`. The Express app runs as a single serverless function.

```json
{
  "builds": [{ "src": "src/server.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/server.ts" }]
}
```

### Frontend

Standard Next.js deployment. SSR is required — do not add `output: 'export'`.

Set `NEXT_PUBLIC_API_URL` in the frontend Vercel project to the backend's Vercel URL.

### Stripe Webhooks

After deploying the backend, register the webhook endpoint in the Stripe Dashboard:

- URL: `https://<your-backend>.vercel.app/api/webhooks`
- Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
