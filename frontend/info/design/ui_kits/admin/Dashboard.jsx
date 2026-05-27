/* Admin — Dashboard. Mirrors frontend/app/(admin)/admin/page.tsx. */

function Dashboard({ data, onOpenTicket }) {
  const openTickets = data.tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length;
  const lowStock = data.inventory.filter(i => i.minStock != null && i.quantity <= i.minStock);

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard" subtitle="Resumen de operaciones" />

      <div className="stats-grid">
        <StatsCard title="Tickets activos" value={openTickets} icon="ticket" color="#2563eb" />
        <StatsCard title="Clientes" value={data.clients.length} icon="building" color="#16a34a" />
        <StatsCard title="Items en inventario" value={data.inventory.length} icon="package" color="#9333ea" />
        <StatsCard title="Bajo stock" value={lowStock.length} icon="alert" color="#ef4444" description="Requieren reposición" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><div className="card-title">Últimos tickets</div></div>
          <div className="card-content">
            <div className="list-rows">
              {data.tickets.slice(0, 5).map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs muted">
                      {t.client.name}<span className="meta-sep"></span>{formatDate(t.createdAt)}
                    </div>
                  </div>
                  <div className="row" style={{ flexShrink: 0, gap: 4 }}>
                    <StatusPill status={t.status} />
                    <PriorityPill priority={t.priority} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Inventario bajo stock</div></div>
          <div className="card-content">
            {lowStock.length === 0 ? (
              <p className="text-sm muted">Todos los items tienen stock suficiente</p>
            ) : (
              <div className="list-rows">
                {lowStock.slice(0, 5).map(i => (
                  <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <div className="text-sm font-medium">{i.name}</div>
                      <div className="text-xs muted">{i.sku || "Sin SKU"}</div>
                    </div>
                    <span className="pill pill-destructive">{i.quantity} {i.unit || "uds"}</span>
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

window.Dashboard = Dashboard;
