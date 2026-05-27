# deployr Client portal UI kit

The maintenance customer's self-service portal. They watch their open tickets, request a new visit, and review what's been done.

## Files

- `index.html` — interactive shell with sidebar navigation between the three client pages.
- `Dashboard.jsx` — 3 KPI tiles + "Tickets recientes" + "Próximas visitas". Mirrors `frontend/app/(client)/client/page.tsx`.
- `Schedule.jsx` — datetime picker + optional branch select + notes textarea + the list of past requests. Mirrors `frontend/app/(client)/client/schedule/page.tsx`.
- `History.jsx` — completed tickets, click any row to expand its detail inline. Mirrors `frontend/app/(client)/client/history/page.tsx`.

## Behaviour you can actually try

1. Switch tabs in the sidebar — Dashboard ↔ Agendar Visita ↔ Historial.
2. Fill in the schedule form and submit → see the success toast + the new request appear in "Mis solicitudes".
3. Click a row in Historial to expand its detail.

## Patterns demonstrated

- **First-person voice for owned content:** "Mi Panel", "Mis solicitudes". Compare with admin's impersonal "Resumen de operaciones".
- **`max-w-2xl` (~720px) for input-heavy pages:** Agendar Visita is one column, not full-bleed.
- **Native `<select>` styled to match `<Input>`:** same 40px height, same border, same radius — the codebase doesn't pull in a Radix Select for this one form.
- **Expand-in-place row** on Historial: click toggles `selected` state, the detail flows into the same card with a `border-top` divider — no modal.
- **Success toast copy** is verbatim from the live codebase: `"Visita agendada. El equipo confirmará pronto."`
