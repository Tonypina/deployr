/* Auth screen — Register. Mirrors frontend/app/(auth)/register/page.tsx. */

function Register({ onSwitch, onRegisterSuccess }) {
  const [values, setValues] = React.useState({
    companyName: "Servicios XYZ S.A.",
    companyEmail: "contacto@serviciosxyz.com",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  function set(k, v) { setValues((p) => ({ ...p, [k]: v })); }
  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (values.companyName.length < 2) errs.companyName = "Mínimo 2 caracteres";
    if (!values.companyEmail.includes("@")) errs.companyEmail = "Email inválido";
    if (values.adminName.length < 2) errs.adminName = "Mínimo 2 caracteres";
    if (!values.adminEmail.includes("@")) errs.adminEmail = "Email inválido";
    if (values.adminPassword.length < 8) errs.adminPassword = "Mínimo 8 caracteres";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onRegisterSuccess(); }, 600);
  }

  function Field({ id, label, type = "text", placeholder, k }) {
    return (
      <div className="col" style={{ gap: 8 }}>
        <label className="label" htmlFor={id}>{label}</label>
        <input
          id={id}
          className={"input" + (errors[k] ? " input-error" : "")}
          type={type}
          placeholder={placeholder}
          value={values[k]}
          onChange={(e) => set(k, e.target.value)}
        />
        {errors[k] ? <div className="label-error">{errors[k]}</div> : null}
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card auth-card-md">
        <div className="auth-header">
          <div className="card-title-lg">Registrar empresa</div>
          <div className="card-description">Crea tu cuenta para comenzar a gestionar tus servicios</div>
        </div>
        <form onSubmit={submit}>
          <div className="auth-content">
            <div className="text-xs font-semibold muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>Empresa</div>
            <Field id="companyName" k="companyName" label="Nombre de la empresa" placeholder="Servicios XYZ S.A." />
            <Field id="companyEmail" k="companyEmail" label="Email corporativo" type="email" placeholder="contacto@empresa.com" />

            <div className="text-xs font-semibold muted" style={{ textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>Administrador</div>
            <Field id="adminName" k="adminName" label="Nombre completo" placeholder="Juan Pérez" />
            <Field id="adminEmail" k="adminEmail" label="Email del administrador" type="email" placeholder="admin@empresa.com" />
            <Field id="adminPassword" k="adminPassword" label="Contraseña" type="password" placeholder="••••••••" />
          </div>
          <div className="auth-footer">
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
            <p className="text-sm muted" style={{ textAlign: "center" }}>
              ¿Ya tienes cuenta?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={{ color: "var(--primary)", textDecoration: "none" }}>
                Inicia sesión
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

window.Register = Register;
