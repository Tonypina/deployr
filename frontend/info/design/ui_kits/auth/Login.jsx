/* Auth screen — Login. Mirrors frontend/app/(auth)/login/page.tsx. */

function Login({ onSwitch, onLoginSuccess }) {
  const [email, setEmail] = React.useState("admin@serviciosxyz.com");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState({});
  const { toast, show } = useToast();

  function submit(e) {
    e.preventDefault();
    const errs = {};
    if (!email || !email.includes("@")) errs.email = "Email inválido";
    if (!password) errs.password = "Contraseña requerida";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess();
    }, 600);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="card-title-lg">Iniciar sesión</div>
          <div className="card-description">Ingresa tus credenciales para continuar</div>
        </div>
        <form onSubmit={submit}>
          <div className="auth-content">
            <div className="col" style={{ gap: 8 }}>
              <label className="label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className={"input" + (errors.email ? " input-error" : "")}
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {errors.email ? <div className="label-error">{errors.email}</div> : null}
            </div>
            <div className="col" style={{ gap: 8 }}>
              <label className="label" htmlFor="login-pw">Contraseña</label>
              <input
                id="login-pw"
                className={"input" + (errors.password ? " input-error" : "")}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password ? <div className="label-error">{errors.password}</div> : null}
            </div>
          </div>
          <div className="auth-footer">
            <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
            <p className="text-sm muted" style={{ textAlign: "center" }}>
              ¿Nueva empresa?{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); onSwitch(); }} style={{ color: "var(--primary)", textDecoration: "none" }}>
                Regístrate
              </a>
            </p>
          </div>
        </form>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

window.Login = Login;
