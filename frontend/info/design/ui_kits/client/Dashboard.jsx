/* Client — Dashboard. Mirrors frontend/app/(client)/client/page.tsx. */

function ClientDashboard({ tickets, visits }) {
  const active = tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS");
  const completed = tickets.filter(t => t.status === "COMPLETED");
  const pending = visits.filter(v => v.status === "PENDING" || v.status === "CONFIRMED");

  return (
    <div className="page-stack">
      <PageHeader title="Mi Panel" subtitle="Resumen de tus servicios" />

      <div className="stats-grid">
        <StatsCard title="Tickets activos" value={active.length} icon="ticket" color="#2563eb" />
        <StatsCard title="Visitas programadas" value={pending.length} icon="calendar" color="#f97316" />
        <StatsCard title="Servicios completados" value={completed.length} icon="clipboard-check" color="#16a34a" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Tickets recientes</div></div>
          <div className="card-content">
            <div className="list-rows">
              {tickets.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    <div className="text-xs muted">{formatDate(t.createdAt)}</div>
                  </div>
                  <StatusPill status={t.status} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Próximas visitas</div></div>
          <div className="card-content">
            {pending.length === 0 ? (
              <p className="text-sm muted">Sin visitas programadas</p>
            ) : (
              <div className="list-rows">
                {pending.slice(0, 5).map(v => (
                  <div key={v.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <div className="text-sm font-medium">{formatDate(v.requestedAt)}</div>
                      {v.branch ? <div className="text-xs muted">{v.branch.name}</div> : null}
                      {v.notes ? <div className="text-xs muted">{v.notes}</div> : null}
                    </div>
                    <span className="pill pill-vs-confirmed">{VISIT_LABEL[v.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ClientDashboard = ClientDashboard;
