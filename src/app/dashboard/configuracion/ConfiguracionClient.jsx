"use client";

export default function ConfiguracionClient() {
  return (
    <div className="content-stage">
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 800 }}>
        
        {/* Card Conexiones */}
        <div className="stat-card" style={{ padding: 24, height: "auto" }}>
          <div className="stat-header" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Conexiones del Sistema</span>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>cloud_done</span>
          </div>
          
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Base de Datos (Supabase)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", background: "var(--surface-variant)", borderRadius: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#4edea3" }}>check_circle</span>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--on-surface-variant)" }}>
                Conectado a Proyecto ID: {process.env.NEXT_PUBLIC_SUPABASE_URL?.split(".")[0].replace("https://", "") || "Local"}
              </span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Motor de Inteligencia Artificial (Gemini)</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px", background: "var(--surface-variant)", borderRadius: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#4edea3" }}>check_circle</span>
              <span style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>
                Google Gemini Flash 1.5 - Activo
              </span>
            </div>
          </div>
        </div>

        {/* Card Backup */}
        <div className="stat-card" style={{ padding: 24, height: "auto" }}>
          <div className="stat-header" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>Copia de Seguridad</span>
            <span className="material-symbols-outlined" style={{ color: "var(--error)" }}>security</span>
          </div>
          <p style={{ color: "var(--on-surface-variant)", marginBottom: 16, fontSize: 14 }}>
            Los datos se respaldan automáticamente de forma segura en los servidores de Supabase mediante Point-in-Time Recovery.
          </p>
          <div style={{ padding: "12px", background: "rgba(255, 180, 171, 0.1)", borderRadius: 8, border: "1px solid rgba(255, 180, 171, 0.2)" }}>
            <span style={{ fontSize: 13, color: "#ffb4ab", display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>info</span>
              Cualquier exportación masiva o borrado de la base de datos será registrado.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
