/* Admin — Inventory. Mirrors frontend/app/(admin)/admin/inventory/page.tsx. */

function Inventory({ items, setItems, onToast }) {
  const [showForm, setShowForm] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", sku: "", quantity: 0, unit: "", minStock: "" });
  const lowStock = items.filter(i => i.minStock != null && i.quantity <= i.minStock);

  function adjust(id, delta) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i));
  }
  function submit(e) {
    e.preventDefault();
    if (draft.name.length < 2) return;
    const newItem = {
      id: "i" + Math.random().toString(36).slice(2, 8),
      name: draft.name,
      sku: draft.sku || undefined,
      quantity: Number(draft.quantity) || 0,
      unit: draft.unit || undefined,
      minStock: draft.minStock ? Number(draft.minStock) : undefined,
    };
    setItems(prev => [newItem, ...prev]);
    setDraft({ name: "", sku: "", quantity: 0, unit: "", minStock: "" });
    setShowForm(false);
    onToast({ title: "Item agregado" });
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Inventario"
        subtitle={`${items.length} items · ${lowStock.length} bajo stock`}
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Icon name="plus" />
            Agregar item
          </button>
        }
      />

      {showForm && (
        <div className="card">
          <div className="card-header"><div className="card-title">Nuevo item</div></div>
          <div className="card-content">
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 16 }}>
              <div className="col" style={{ gap: 8 }}>
                <label className="label">Nombre</label>
                <input className="input" placeholder="Filtro de aire" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                <label className="label">SKU</label>
                <input className="input" placeholder="FA-001" value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                <label className="label">Cantidad inicial</label>
                <input className="input" type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                <label className="label">Unidad</label>
                <input className="input" placeholder="pzas, litros..." value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              </div>
              <div className="col" style={{ gap: 8 }}>
                <label className="label">Stock mínimo</label>
                <input className="input" type="number" value={draft.minStock} onChange={(e) => setDraft({ ...draft, minStock: e.target.value })} />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="col" style={{ gap: 12 }}>
        {items.map(i => {
          const isLow = i.minStock != null && i.quantity <= i.minStock;
          return (
            <div key={i.id} className="card" style={{ borderColor: isLow ? "rgba(239,68,68,.5)" : undefined }}>
              <div className="card-content-tight" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="font-semibold">{i.name}</div>
                    {isLow && (
                      <span className="pill pill-destructive">
                        <Icon name="alert" size={11} /> Bajo stock
                      </span>
                    )}
                  </div>
                  {i.sku ? <div className="text-xs muted">SKU: {i.sku}</div> : null}
                  {i.minStock != null ? <div className="text-xs muted">Mínimo: {i.minStock} {i.unit || ""}</div> : null}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-outline btn-icon-sm" onClick={() => adjust(i.id, -1)}><Icon name="minus" size={12} /></button>
                  <span style={{ fontSize: 18, fontWeight: 700, width: 48, textAlign: "center" }}>{i.quantity}</span>
                  <button className="btn btn-outline btn-icon-sm" onClick={() => adjust(i.id, 1)}><Icon name="plus" size={12} /></button>
                  <span className="text-xs muted">{i.unit || "uds"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.AdminInventory = Inventory;
