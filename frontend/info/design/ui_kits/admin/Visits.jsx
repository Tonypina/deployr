/* Admin — Visits queue. Mirrors frontend/app/(admin)/admin/visits/page.tsx. */

const VISIT_FILTERS = [
  { value: "", label: "Todas" },
  { value: "PENDING", label: "Pendiente" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "COMPLETED", label: "Completada" },
  { value: "CANCELLED", label: "Cancelada" },
];

function Visits({ visits, setVisits, onToast }) {
  const [filter, setFilter] = React.useState("");
  const filtered = filter ? visits.filter(v => v.status === filter) : visits;

  function update(id, status) {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, status } : v));
    onToast({ title: status === "CONFIRMED" ? "Visita confirmada" : "Visita cancelada" });
  }

  return (
    <div className="page-stack">
      <PageHeader title="Visitas programadas" subtitle={`${visits.length} solicitudes`} />
      <FilterChips value={filter} onChange={setFilter} options={VISIT_FILTERS} />

      {filtered.length === 0 ? (
        <EmptyState icon="calendar" title="Sin visitas" />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {filtered.map(v => (
            <div key={v.id} className="card">
              <div className="card-content-tight" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="font-semibold">{v.client.name}</div>
                  <div className="text-sm muted">{formatDate(v.requestedAt)}</div>
                  {v.branch ? <div className="text-sm muted">{v.branch.name}{v.branch.city ? ` - ${v.branch.city}` : ""}</div> : null}
                  {v.notes ? <div className="text-sm muted" style={{ marginTop: 4 }}>{v.notes}</div> : null}
                  <div style={{ marginTop: 8 }}><VisitPill status={v.status} /></div>
                </div>
                {v.status === "PENDING" && (
                  <div className="row" style={{ gap: 8, flexShrink: 0 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => update(v.id, "CONFIRMED")}>Confirmar</button>
                    <button className="btn btn-outline btn-sm" onClick={() => update(v.id, "CANCELLED")}>Cancelar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.AdminVisits = Visits;
