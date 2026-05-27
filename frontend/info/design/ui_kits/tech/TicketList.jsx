/* Tech — Ticket list. Mirrors frontend/app/(tech)/tech/page.tsx. */

const TECH_FILTERS = [
  { value: "", label: "Todos" },
  { value: "OPEN", label: "Abierto" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completado" },
];

function TechTicketList({ tickets, onOpen }) {
  const [filter, setFilter] = React.useState("");
  const filtered = filter ? tickets.filter(t => t.status === filter) : tickets;

  return (
    <div className="page-stack">
      <PageHeader title="Mis Tickets" subtitle={`${tickets.length} asignados`} />
      <FilterChips value={filter} onChange={setFilter} options={TECH_FILTERS} />

      {filtered.length === 0 ? (
        <EmptyState icon="clipboard" title="Sin tickets asignados" />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {filtered.map(t => (
            <div key={t.id} className="card card-hover" onClick={() => onOpen(t.id)} style={{ cursor: "pointer" }}>
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
                    {t.scheduledAt ? (
                      <div className="text-xs muted" style={{ marginTop: 4 }}>Programado: {formatDate(t.scheduledAt)}</div>
                    ) : null}
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={(e) => { e.stopPropagation(); onOpen(t.id); }}>Ver</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.TechTicketList = TechTicketList;
