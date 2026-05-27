/* Client — Schedule a visit. Mirrors frontend/app/(client)/client/schedule/page.tsx. */

function ClientSchedule({ visits, addVisit, onToast }) {
  const [requestedAt, setRequestedAt] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  const BRANCHES = [
    { id: "b1", name: "Sucursal Norte", city: "Monterrey" },
    { id: "b3", name: "Sucursal Sur", city: "Querétaro" },
  ];

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!requestedAt) errs.requestedAt = "Selecciona fecha y hora";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setTimeout(() => {
      addVisit({
        id: "v" + Math.random().toString(36).slice(2, 8),
        requestedAt: new Date(requestedAt).toISOString(),
        notes: notes || undefined,
        status: "PENDING",
        client: { id: "c1", name: "Servicios XYZ" },
        branch: branchId ? BRANCHES.find(b => b.id === branchId) : undefined,
      });
      setRequestedAt(""); setBranchId(""); setNotes("");
      setSaving(false);
      onToast({ title: "Visita agendada. El equipo confirmará pronto." });
    }, 400);
  }

  return (
    <div className="page-stack" style={{ maxWidth: 720 }}>
      <PageHeader title="Agendar visita" subtitle="Solicita una visita técnica" />

      <div className="card">
        <div className="card-header"><div className="card-title">Nueva solicitud</div></div>
        <div className="card-content">
          <form onSubmit={submit} className="col" style={{ gap: 16 }}>
            <div className="col" style={{ gap: 8 }}>
              <label className="label">Fecha y hora deseada *</label>
              <input className={"input" + (errors.requestedAt ? " input-error" : "")} type="datetime-local" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} />
              {errors.requestedAt ? <div className="label-error">{errors.requestedAt}</div> : null}
            </div>
            <div className="col" style={{ gap: 8 }}>
              <label className="label">Sucursal</label>
              <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Seleccionar sucursal</option>
                {BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name} - {b.city}</option>)}
              </select>
            </div>
            <div className="col" style={{ gap: 8 }}>
              <label className="label">Notas adicionales</label>
              <textarea className="textarea" rows={3} placeholder="Describe el motivo o equipo a revisar..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Agendando..." : "Solicitar visita"}</button>
          </form>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, letterSpacing: "-.01em" }}>Mis solicitudes</h2>
        {visits.length === 0 ? (
          <p className="text-sm muted">Sin visitas agendadas</p>
        ) : (
          <div className="col" style={{ gap: 12 }}>
            {visits.map(v => (
              <div key={v.id} className="card">
                <div className="card-content-tight" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div className="font-medium">{formatDate(v.requestedAt)}</div>
                    {v.branch ? <div className="text-sm muted">{v.branch.name}</div> : null}
                    {v.notes ? <div className="text-sm muted">{v.notes}</div> : null}
                  </div>
                  <VisitPill status={v.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

window.ClientSchedule = ClientSchedule;
