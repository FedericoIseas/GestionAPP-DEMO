"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const err = searchParams.get("error");
    const reason = searchParams.get("reason");
    if (err === "unauthorized") {
      setError("Acceso denegado. Esta aplicación es de uso exclusivo del administrador.");
    } else if (reason === "idle") {
      setError("Tu sesión ha expirado por inactividad (1 hora). Por favor, volvé a ingresar.");
    }
  }, [searchParams]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message.includes("Invalid login credentials")
          ? "Credenciales incorrectas. Verificá el email y la contraseña."
          : authError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error inesperado. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-blob" style={{ width: 500, height: 500, left: "60%", top: "-15%", background: "radial-gradient(circle, rgba(173,198,255,0.12) 0%, transparent 70%)" }} />
      <div className="login-blob" style={{ width: 400, height: 400, left: "-10%", bottom: "5%", background: "radial-gradient(circle, rgba(78,222,163,0.08) 0%, transparent 70%)" }} />

      <div className="login-card" style={{
        transition: "all 0.7s",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(32px)",
      }}>
        <div className="login-logo">
          <span className="material-symbols-outlined" style={{ fontSize: 28, color: "#00285d" }}>group_work</span>
        </div>
        <h1 className="login-title">Team Manager</h1>
        <p className="login-subtitle">Panel de administración privado</p>

        {error && (
          <div className="error-box">
            <span className="material-symbols-outlined" style={{ color: "#ffb4ab", fontSize: 18, flexShrink: 0 }}>error</span>
            <p className="error-text">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mail</span>
              </div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ejemplo.com" required autoComplete="email" className="form-input" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <div className="input-wrapper">
              <div className="input-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
              </div>
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required autoComplete="current-password" className="form-input"
                style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} className="input-toggle" tabIndex={-1}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{showPass ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading || !email || !password} className="submit-btn">
            {loading ? (
              <><span className="material-symbols-outlined" style={{ fontSize: 18, animation: "spin 1s linear infinite" }}>progress_activity</span> Iniciando sesión…</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span> Ingresar al panel</>
            )}
          </button>
        </form>

        <div className="login-footer">Acceso restringido · Solo administrador</div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="login-page"><p>Cargando...</p></div>}>
      <LoginContent />
    </Suspense>
  );
}
