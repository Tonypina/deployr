/* deployr — shared interactive primitives used by every UI kit.
 * Pill, StatsCard, EmptyState, Sidebar, FilterChips, PageHeader.
 * All depend on window.Icon (icons.jsx) being loaded first.
 */

const STATUS_LABEL = { OPEN: "Abierto", IN_PROGRESS: "En progreso", COMPLETED: "Completado", CANCELLED: "Cancelado" };
const STATUS_CLASS = { OPEN: "pill-st-open", IN_PROGRESS: "pill-st-progress", COMPLETED: "pill-st-completed", CANCELLED: "pill-st-cancelled" };
const PRIORITY_LABEL = { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", URGENT: "Urgente" };
const PRIORITY_CLASS = { LOW: "pill-pr-low", MEDIUM: "pill-pr-medium", HIGH: "pill-pr-high", URGENT: "pill-pr-urgent" };
const VISIT_LABEL = { PENDING: "Pendiente", CONFIRMED: "Confirmada", COMPLETED: "Completada", CANCELLED: "Cancelada" };
const VISIT_CLASS = { PENDING: "pill-vs-pending", CONFIRMED: "pill-vs-confirmed", COMPLETED: "pill-vs-completed", CANCELLED: "pill-vs-cancelled" };

function StatusPill({ status }) {
  return <span className={"pill " + STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>;
}
function PriorityPill({ priority }) {
  return <span className={"pill " + PRIORITY_CLASS[priority]}>{PRIORITY_LABEL[priority]}</span>;
}
function VisitPill({ status }) {
  return <span className={"pill " + VISIT_CLASS[status]}>{VISIT_LABEL[status]}</span>;
}

function StatsCard({ title, value, description, icon, color }) {
  return (
    <div className="stats-card">
      <div className="stats-card-inner">
        <div>
          <div className="stats-title">{title}</div>
          <div className="stats-value">{value}</div>
          {description ? <div className="stats-description">{description}</div> : null}
        </div>
        <div className="stats-icon-wrap" style={{ color: color || "var(--primary)" }}>
          <Icon name={icon} size={22} />
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 24px", gap: 8 }}>
      <Icon name={icon} size={40} style={{ color: "var(--fg-muted)", strokeWidth: 1.5 }} />
      <div className="font-semibold">{title}</div>
      {hint ? <div className="text-sm muted">{hint}</div> : null}
      {action ? <div style={{ marginTop: 8 }}>{action}</div> : null}
    </div>
  );
}

function Sidebar({ companyName, userName, role, nav, activeHref, onNavigate, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-eyebrow">MAINTENANCE</div>
        <div className="sidebar-name">{userName}</div>
        <div className="sidebar-role">{role}</div>
      </div>
      <nav className="sidebar-nav">
        {nav.map((item) => {
          const active = item.href === activeHref;
          return (
            <a
              key={item.href}
              className={"sidebar-link" + (active ? " active" : "")}
              onClick={(e) => { e.preventDefault(); onNavigate(item.href); }}
              href={"#" + item.href}
            >
              <Icon name={item.icon} className="icon" />
              {item.label}
              {active ? <Icon name="chevron-right" className="chev" size={12} /> : null}
            </a>
          );
        })}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>
        <Icon name="logout" />
        Cerrar sesión
      </button>
    </aside>
  );
}

function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <div className="subtitle">{subtitle}</div> : null}
      </div>
      {action || null}
    </div>
  );
}

function FilterChips({ value, onChange, options }) {
  return (
    <div className="row-wrap">
      {options.map((o) => (
        <button
          key={o.value}
          className={"btn btn-sm " + (value === o.value ? "btn-primary" : "btn-outline")}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={"toast" + (toast.variant === "destructive" ? " toast-destructive" : "")}>
      <div style={{ flex: 1 }}>
        {toast.title ? <div className="toast-title">{toast.title}</div> : null}
        {toast.description ? <div className="toast-desc">{toast.description}</div> : null}
      </div>
    </div>
  );
}

function useToast() {
  const [toast, setToast] = React.useState(null);
  const show = React.useCallback((t) => {
    setToast(t);
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, []);
  return { toast, show };
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

Object.assign(window, {
  StatusPill, PriorityPill, VisitPill,
  StatsCard, EmptyState, Sidebar, PageHeader, FilterChips, Toast, useToast,
  STATUS_LABEL, PRIORITY_LABEL, VISIT_LABEL,
  formatDate,
});
