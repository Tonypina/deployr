/* Tech — Ticket detail + report form.
 * Mirrors frontend/app/(tech)/tech/tickets/[id]/page.tsx. */

const STATUS_TRANSITIONS = { OPEN: "IN_PROGRESS", IN_PROGRESS: "COMPLETED" };

function TechTicketDetail({ ticket, onBack, onUpdateTicket, onToast }) {
  const [report, setReport] = React.useState(ticket.report || null);
  const [draft, setDraft] = React.useState({ findings: "", actions: "", partsUsed: "", nextVisitDate: "" });
  const [errors, setErrors] = React.useState({});
  const [saving, setSaving] = React.useState(false);

  const nextStatus = STATUS_TRANSITIONS[ticket.status];

  function advance() {
    if (!nextStatus) return;
    onUpdateTicket({ ...ticket, status: nextStatus });
    onToast({ title: `Ticket actualizado a "${STATUS_LABEL[nextStatus]}"` });
  }

  function submitReport(e) {
    e.preventDefault();
    const errs = {};
    if (draft.findings.length < 10) errs.findings = "Mínimo 10 caracteres";
    if (draft.actions.length < 10)  errs.actions  = "Mínimo 10 caracteres";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setTimeout(() => {
      const r = { id: "r" + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), ...draft };
      setReport(r);
      onUpdateTicket({ ...ticket, status: "COMPLETED", report: r });
      setSaving(false);
      onToast({ title: "Reporte enviado exitosamente" });
    }, 500);
  }

  return (
    <div className="page-stack" style={{ maxWidth: 720 }}>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-ghost btn-icon" onClick={onBack}><Icon name="chevron-left" /></button>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em" }}>Ticket</h1>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="row-wrap" style={{ gap: 6 }}>
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 8, letterSpacing: "-.01em" }}>{ticket.title}</div>
        </div>
        <div className="card-content" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {ticket.description ? <p className="text-sm muted">{ticket.description}</p> : null}
          <div className="grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="text-sm"><span className="muted">Cliente:</span> <span className="font-medium">{ticket.client.name}</span></div>
            {ticket.branch ? <div className="text-sm"><span className="muted">Sucursal:</span> <span className="font-medium">{ticket.branch.name}</span></div> : null}
            {ticket.equipment ? <div className="text-sm"><span className="muted">Equipo:</span> <span className="font-medium">{ticket.equipment.name}</span></div> : null}
            {ticket.scheduledAt ? <div className="text-sm"><span className="muted">Programado:</span> <span className="font-medium">{formatDate(ticket.scheduledAt)}</span></div> : null}
          </div>
          {nextStatus ? (
            <button className="btn btn-primary btn-full" onClick={advance}>
              {`Marcar como "${STATUS_LABEL[nextStatus]}"`}
            </button>
          ) : null}
        </div>
      </div>

      {ticket.status !== "OPEN" ? (
        <div className="card">
          <div className="card-header">
            <div className="card-title">{report ? "Reporte enviado" : "Completar reporte"}</div>
          </div>
          <div className="card-content">
            {report ? (
              <div className="col" style={{ gap: 12 }}>
                <div><div className="text-xs muted font-medium">Hallazgos</div><div className="text-sm">{report.findings}</div></div>
                <div><div className="text-xs muted font-medium">Acciones realizadas</div><div className="text-sm">{report.actions}</div></div>
                {report.partsUsed ? <div><div className="text-xs muted font-medium">Partes utilizadas</div><div className="text-sm">{report.partsUsed}</div></div> : null}
                {report.nextVisitDate ? <div><div className="text-xs muted font-medium">Próxima visita</div><div className="text-sm">{formatDate(report.nextVisitDate)}</div></div> : null}
                <span className="pill pill-secondary" style={{ alignSelf: "flex-start" }}>Enviado {formatDate(report.createdAt)}</span>
              </div>
            ) : (
              <form onSubmit={submitReport} className="col" style={{ gap: 16 }}>
                <div className="col" style={{ gap: 8 }}>
                  <label className="label">Hallazgos *</label>
                  <textarea className={"textarea" + (errors.findings ? " input-error" : "")} rows={3} placeholder="Describe lo que encontraste..." value={draft.findings} onChange={(e) => setDraft({ ...draft, findings: e.target.value })} />
                  {errors.findings ? <div className="label-error">{errors.findings}</div> : null}
                </div>
                <div className="col" style={{ gap: 8 }}>
                  <label className="label">Acciones realizadas *</label>
                  <textarea className={"textarea" + (errors.actions ? " input-error" : "")} rows={3} placeholder="Describe las acciones que realizaste..." value={draft.actions} onChange={(e) => setDraft({ ...draft, actions: e.target.value })} />
                  {errors.actions ? <div className="label-error">{errors.actions}</div> : null}
                </div>
                <div className="col" style={{ gap: 8 }}>
                  <label className="label">Partes/refacciones utilizadas</label>
                  <input className="input" placeholder="Filtro FA-001, correa..." value={draft.partsUsed} onChange={(e) => setDraft({ ...draft, partsUsed: e.target.value })} />
                </div>
                <div className="col" style={{ gap: 8 }}>
                  <label className="label">Próxima visita recomendada</label>
                  <input className="input" type="datetime-local" value={draft.nextVisitDate} onChange={(e) => setDraft({ ...draft, nextVisitDate: e.target.value })} />
                </div>
                <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Enviando..." : "Enviar reporte"}</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

window.TechTicketDetail = TechTicketDetail;
