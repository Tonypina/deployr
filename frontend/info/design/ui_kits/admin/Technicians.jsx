/* Admin — Technicians. Mirrors frontend/app/(admin)/admin/technicians/page.tsx. */

function Technicians({ technicians, setTechnicians, onToast }) {
  const [showForm, setShowForm] = React.useState(false);
  const [draft, setDraft] = React.useState({ name: "", email: "", password: "", phone: "" });
  const [search, setSearch] = React.useState("");

  function submit(e) {
    e.preventDefault();
    if (draft.name.length < 2 || !draft.email.includes("@") || draft.password.length < 8) return;
    const newT = { id: "t" + Math.random().toString(36).slice(2, 8), name: draft.name, email: draft.email, phone: draft.phone || undefined, isActive: true };
    setTechnicians(prev => [newT, ...prev]);
    setDraft({ name: "", email: "", password: "", phone: "" });
    setShowForm(false);
    onToast({ title: "Técnico creado exitosamente" });
  }
  function toggle(id) {
    setTechnicians(prev => prev.map(t => t.id === id ? { ...t, isActive: !t.isActive } : t));
  }

  const filtered = technicians.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || (t.phone || "").toLowerCase().includes(q);
  });

  return (
    <div className="page-stack">
      <PageHeader
        title="Técnicos"
        subtitle={`${technicians.length} técnicos registrados`}
        action={
          <button className="btn btn-primary" onClick={() => setShowForm(s => !s)}>
            <Icon name="plus" />
            Nuevo técnico
          </button>
        }
      />

      <div style={{ position: "relative", maxWidth: 360 }}>
        <Icon name="search" size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--fg-muted)" }} />
        <input className="input" placeholder="Buscar..." style={{ paddingLeft: 36 }} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header"><div className="card-title">Registrar técnico</div></div>
          <div className="card-content">
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["name", "Nombre", "Carlos Mendoza", "text"],
                ["email", "Email", "tecnico@empresa.com", "email"],
                ["password", "Contraseña temporal", "••••••••", "password"],
                ["phone", "Teléfono (opcional)", "+52 55 0000 0000", "tel"],
              ].map(([k, label, ph, type]) => (
                <div key={k} className="col" style={{ gap: 8 }}>
                  <label className="label">{label}</label>
                  <input className="input" type={type} placeholder={ph} value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="col" style={{ gap: 12 }}>
        {filtered.length === 0 ? (
          <EmptyState icon="users" title={search ? "Sin resultados" : "Sin técnicos"} hint={search ? "Intenta con otro término" : "Agrega tu primer técnico"} />
        ) : filtered.map(t => (
          <div key={t.id} className="card">
            <div className="card-content-tight" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <div className="font-semibold">{t.name}</div>
                  <span className={"pill " + (t.isActive ? "pill-default" : "pill-secondary")}>{t.isActive ? "Activo" : "Inactivo"}</span>
                </div>
                <div className="text-sm muted">{t.email}</div>
                {t.phone ? <div className="text-xs muted">{t.phone}</div> : null}
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => toggle(t.id)} title={t.isActive ? "Desactivar" : "Activar"}>
                <Icon name={t.isActive ? "user-x" : "user-check"} style={{ color: t.isActive ? "var(--destructive)" : "#16a34a" }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

window.AdminTechnicians = Technicians;
