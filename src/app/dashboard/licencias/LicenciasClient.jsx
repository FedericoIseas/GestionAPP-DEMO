"use client";

import { useState } from "react";

export default function LicenciasClient({ initialData, miembros }) {
  const [activeTab, setActiveTab] = useState("solicitudes");

  // Función para normalizar strings (quitar tildes y mayúsculas) y facilitar la comparación
  const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

  // Filtrar solicitudes: quitar comisiones y dejar solo a los que están en 'miembros'
  const solicitudes = (initialData?.solicitudes || []).filter(s => {
    if (s.tipo && s.tipo.toLowerCase().includes("comisión")) return false;
    
    const ag = normalize(s.agente);
    return miembros.some(m => ag.includes(normalize(m.apellido)) || ag.includes(normalize(m.nombre)));
  });

  // Filtrar vacaciones: dejar solo a los que están en 'miembros'
  const vacaciones = (initialData?.vacaciones_2024 || []).filter(v => {
    const ag = normalize(v.apellido + " " + v.nombre);
    return miembros.some(m => ag.includes(normalize(m.apellido)) || ag.includes(normalize(m.nombre)));
  });

  const normativa = initialData?.normativa || [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Licencias (Excel)</h1>
          <p className="page-header-sub">Sincronizado desde "Licencias Firma Digital.xlsx"</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <button 
          className={`btn-sm ${activeTab === "solicitudes" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("solicitudes")}
        >
          Solicitudes (FSOLI)
        </button>
        <button 
          className={`btn-sm ${activeTab === "calendario" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("calendario")}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>calendar_month</span>
          Calendario
        </button>
        <button 
          className={`btn-sm ${activeTab === "vacaciones" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("vacaciones")}
        >
          Saldos Vacaciones
        </button>
        <button 
          className={`btn-sm ${activeTab === "normativa" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("normativa")}
        >
          Normativa
        </button>
      </div>

      <div className="content-stage">
        {activeTab === "solicitudes" && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Tipo / Motivo</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th>Días</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.agente}</td>
                    <td>
                      <span className="badge badge-amber">{s.tipo || "N/A"}</span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{s.desde}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{s.hasta}</td>
                    <td>{s.total_dias}</td>
                    <td style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                      {s.observaciones || s.ccoo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "calendario" && (() => {
          // Filtrar y ordenar las solicitudes por fecha de inicio
          const validas = solicitudes.filter(s => s.desde && s.desde.includes("-"));
          validas.sort((a, b) => new Date(a.desde) - new Date(b.desde));

          // Agrupar por Mes y Año
          const agrupadas = validas.reduce((acc, s) => {
            const fecha = new Date(s.desde + "T12:00:00");
            const mesAnio = fecha.toLocaleDateString("es-AR", { month: "long", year: "numeric" }).toUpperCase();
            if (!acc[mesAnio]) acc[mesAnio] = [];
            acc[mesAnio].push(s);
            return acc;
          }, {});

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 32, padding: "8px 0" }}>
              {Object.entries(agrupadas).map(([mesAnio, items]) => (
                <div key={mesAnio}>
                  <h3 style={{ 
                    fontSize: 18, 
                    fontWeight: 700, 
                    color: "var(--primary)", 
                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                    paddingBottom: 8,
                    marginBottom: 16,
                    display: "flex",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <span className="material-symbols-outlined">event_note</span>
                    {mesAnio}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {items.map((s, i) => {
                      const dDesde = new Date(s.desde + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" });
                      const dHasta = s.hasta && s.hasta.includes("-") ? new Date(s.hasta + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" }) : s.hasta;
                      
                      return (
                        <div key={i} style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 16, 
                          background: "rgba(30,41,59,0.5)", 
                          padding: "12px 16px", 
                          borderRadius: 12,
                          borderLeft: `4px solid ${s.tipo.includes("LAO") ? "var(--primary)" : "var(--amber)"}`
                        }}>
                          <div style={{ minWidth: 140, display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: 600 }}>FECHA</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--on-surface)" }}>
                              {dDesde} {dHasta && dHasta !== dDesde ? ` - ${dHasta}` : ""}
                            </span>
                          </div>
                          
                          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: 600 }}>AGENTE</span>
                            <span style={{ fontSize: 16, fontWeight: 500 }}>{s.agente}</span>
                          </div>

                          <div style={{ minWidth: 100 }}>
                            <span className={`badge ${s.tipo.includes("LAO") ? "badge-blue" : "badge-amber"}`}>{s.tipo}</span>
                          </div>

                          <div style={{ minWidth: 60, textAlign: "right" }}>
                            <span style={{ fontSize: 13, color: "var(--on-surface-variant)", fontWeight: 600 }}>DÍAS</span>
                            <div style={{ fontSize: 18, fontWeight: 700 }}>{s.total_dias || 1}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {activeTab === "vacaciones" && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Días Corridos (Total)</th>
                  <th>Tomadas</th>
                  <th>Resto</th>
                  <th>GDE / Notas</th>
                </tr>
              </thead>
              <tbody>
                {vacaciones.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{v.apellido}, {v.nombre}</td>
                    <td>{v.dias_corridos || "—"}</td>
                    <td>{v.tomadas || "0"}</td>
                    <td>
                      <span className={`badge ${v.resto > 0 ? 'badge-blue' : 'badge-gray'}`}>
                        {v.resto || "0"}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: "var(--on-surface-variant)" }}>
                      {v.gde || v.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "normativa" && (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Licencia</th>
                  <th>Artículo</th>
                  <th>Tiempo</th>
                  <th>Goce de haberes</th>
                  <th>Particularidades</th>
                </tr>
              </thead>
              <tbody>
                {normativa.map((n, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{n.nombre_licencia}</td>
                    <td><span className="badge badge-gray">{n.articulo || "N/A"}</span></td>
                    <td>{n.tiempo || "—"}</td>
                    <td>{n.con_goce === "SI" ? "✅ Sí" : (n.con_goce || "—")}</td>
                    <td style={{ fontSize: 13 }}>{n.particularidades || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
