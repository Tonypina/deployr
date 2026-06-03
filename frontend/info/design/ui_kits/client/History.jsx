/* Client — History. Mirrors frontend/app/(client)/client/history/page.tsx. */

function ClientHistory({ tickets }) {
  const [selected, setSelected] = React.useState(null);
  const completed = tickets.filter(t => t.status === "CLOSED");

  return (
    <div className="page-stack">
      <PageHeader title="Historial de servicios" subtitle={`${completed.length} servicios completados`} />

      {completed.length === 0 ? (
        <EmptyState icon="clipboard" title="Sin historial" hint="Los servicios completados aparecerán aquí" />
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {completed.map(t => (
            <div
              key={t.id}
              className="card card-hover"
              onClick={() => setSelected(selected === t.id ? null : t.id)}
              style={{ cursor: "pointer" }}
            >
              <div className="card-content-tight">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row-wrap" style={{ gap: 6, marginBottom: 6 }}>
                      <StatusPill status={t.status} />
                      <PriorityPill priority={t.priority} />
                    </div>
                    <div className="font-semibold truncate">{t.title}</div>
                    {t.branch ? <div className="text-sm muted">{t.branch.name}{t.branch.city ? ` - ${t.branch.city}` : ""}</div> : null}
                    <div className="text-xs muted" style={{ marginTop: 4 }}>
                      Completado: {formatDate(t.closedAt)}{t.technician ? ` · ${t.technician.name}` : ""}
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm">{selected === t.id ? "Ocultar" : "Detalle"}</button>
                </div>

                {selected === t.id ? (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }} className="col" >
                    {t.description ? <div className="text-sm muted">{t.description}</div> : null}
                    {t.equipment ? <div className="text-sm" style={{ marginTop: 8 }}><span className="font-medium">Equipo: </span>{t.equipment.name}</div> : null}
                    {t.report ? (
                      <div style={{ marginTop: 8 }}>
                        <div className="text-sm font-medium">Tiene reporte técnico</div>
                        <div className="text-xs muted">Reporte ID: {t.report.id}</div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.ClientHistory = ClientHistory;
