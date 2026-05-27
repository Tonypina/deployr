# deployr Technician UI kit

The focused field view. A technician's whole world is "what tickets do I have" → "open one" → "advance status / file the report".

## Files

- `index.html` — interactive shell. Click any ticket to open the detail; the back chevron returns to the list.
- `TicketList.jsx` — filtered list. Mirrors `frontend/app/(tech)/tech/page.tsx`.
- `TicketDetail.jsx` — header card (status / priority / meta) + status-advance button + report form (hallazgos / acciones / partes / próxima visita). Mirrors `frontend/app/(tech)/tech/tickets/[id]/page.tsx`.

## Behaviour you can actually try

1. Click any ticket → detail screen.
2. On an `Abierto` ticket: hit **Marcar como "En progreso"** to bump status. The report form unlocks once the ticket leaves OPEN.
3. Fill **Hallazgos** + **Acciones** (10+ chars each), submit → ticket flips to COMPLETED and the form becomes a read-only summary.

## Patterns demonstrated

- **Narrow detail layout:** `max-width: 720px` — the field view is one column, not full-bleed.
- **Back chevron pattern:** a ghost icon button + page H1, no other header chrome.
- **Two-card stack:** ticket info on top, report below — both `<Card>` with `card-header` + `card-content`.
- **Status transition button:** wide `btn-primary` inside the ticket info card, label echoes the next state ("Marcar como 'Completado'").
- **Form errors:** field-level red text in `label-error` style, plus `input-error` on the field border.
- **Read-only mode for a submitted report:** muted `text-xs font-medium` labels with the actual content beneath; a "Enviado {date}" pill at the bottom.
