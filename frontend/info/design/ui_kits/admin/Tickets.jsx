/* Admin — Tickets list. Mirrors frontend/app/(admin)/admin/tickets/page.tsx. */

const TICKET_STATUSES = [
  { value: "", label: "Todos" },
  { value: "OPEN", label: "Abierto" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completado" },
  { value: "CANCELLED", label: "Cancelado" },
];

function Tickets({ tickets, onOpenTicket, onCreate }) {
  const [filter, setFilter] = React.useState("");
  const filtered = filter ? tickets.filter(t => t.status === filter) : tickets;

  return (
    <div className="page-stack">
      <PageHeader
        title="Tickets"
        subtitle={`${tickets.length} tickets en total`}
        action={
          <button className="btn btn-primary" onClick={onCreate}>
            <Icon name="plus" />
            Nuevo ticket
          </button>
        }
      />

      <FilterChips value={filter} onChange={setFilter} options={TICKET_STATUSES} />

      {filtered.length === 0 ? (
        <EmptyState icon="ticket" title="Sin tickets" hint={filter ? "Prueba otro filtro" : null} />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {filtered.map(t => (
            <div key={t.id} className="card card-hover" onClick={() => onOpenTicket(t.id)} style={{ cursor: "pointer" }}>
              <div className="card-content-tight">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row-wrap" style={{ marginBottom: 6, gap: 6 }}>
                      <StatusPill status={t.status} />
                      <PriorityPill priority={t.priority} />
                    </div>
                    <div className="font-semibold truncate">{t.title}</div>
                    <div className="text-sm muted">
                      {t.client.name}{t.branch ? ` · ${t.branch.name}` : ""}
                    </div>
                    <div className="text-xs muted" style={{ marginTop: 2 }}>
                      {t.technician ? `Técnico: ${t.technician.name}` : "Sin técnico asignado"}
                      <span className="meta-sep"></span>{formatDate(t.scheduledAt || t.createdAt)}
                    </div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); onOpenTicket(t.id); }}>Ver</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.AdminTickets = Tickets;
