"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

const DIAS_LABORALES = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
];

export default function HorariosClient({ horarios: initial, miembros }) {
  const [horarios, setHorarios] = useState(initial);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  function handleCopy(m) {
    const mDraft = draft[m.id] || { 1: false, 2: false, 3: false, 4: false, 5: false };
    const getStatusText = (val) => val ? "🏡 Home Office" : "🏢 Presencial";
    const text = `📋 Cronograma de Home Office
──────────────────────────────
• Miembro: ${m.apellido}, ${m.nombre}
• Equipo: ${m.equipo || "—"}
• Lunes: ${getStatusText(mDraft[1])}
• Martes: ${getStatusText(mDraft[2])}
• Miércoles: ${getStatusText(mDraft[3])}
• Jueves: ${getStatusText(mDraft[4])}
• Viernes: ${getStatusText(mDraft[5])}`;

    navigator.clipboard.writeText(text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportExcel() {
    const data = miembros.map(m => {
      const mDraft = draft[m.id] || { 1: false, 2: false, 3: false, 4: false, 5: false };
      return {
        "Miembro": `${m.apellido}, ${m.nombre}`,
        "Equipo": m.equipo || "",
        "Lunes": mDraft[1] ? "Home Office" : "Presencial",
        "Martes": mDraft[2] ? "Home Office" : "Presencial",
        "Miércoles": mDraft[3] ? "Home Office" : "Presencial",
        "Jueves": mDraft[4] ? "Home Office" : "Presencial",
        "Viernes": mDraft[5] ? "Home Office" : "Presencial"
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cronograma HO");
    XLSX.writeFile(workbook, "Cronograma_Home_Office.xlsx");
  }

  useEffect(() => {
    const newDraft = {};
    miembros.forEach(m => {
      newDraft[m.id] = { 1: false, 2: false, 3: false, 4: false, 5: false };
    });
    horarios.forEach(h => {
      if (newDraft[h.miembro_id]) {
        newDraft[h.miembro_id][h.dia_semana] = h.es_home_office;
      }
    });
    setDraft(newDraft);
  }, [horarios, miembros]);

  function handleToggle(miembroId, dia) {
    setDraft(prev => ({
      ...prev,
      [miembroId]: {
        ...prev[miembroId],
        [dia]: !prev[miembroId][dia]
      }
    }));
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    const supabase = createClient();

    const memberIds = miembros.map(m => m.id);
    
    // Eliminar todos los horarios actuales
    if (memberIds.length > 0) {
      await supabase.from("horarios").delete().in("miembro_id", memberIds);
    }

    const registros = [];
    for (const mId in draft) {
      for (const dia in draft[mId]) {
        registros.push({
          miembro_id: mId,
          dia_semana: parseInt(dia),
          es_home_office: draft[mId][dia],
          activo: true,
        });
      }
    }

    const { data, error: dbError } = await supabase
      .from("horarios")
      .insert(registros)
      .select("*, miembros(nombre, apellido)");

    if (dbError) {
      setError(dbError.message);
    } else {
      setHorarios(data || []);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  // Ordenar miembros por equipo, luego por apellido
  const EQUIPO_ORDER = { "Director": 1, "Coordinación": 2, "Técnicos": 3, "Expedientes": 4, "Oficiales de Registro": 5, "Analista Legal": 6 };
  
  const miembrosOrdenados = [...miembros].sort((a, b) => {
    const ordenA = EQUIPO_ORDER[a.equipo] || 99;
    const ordenB = EQUIPO_ORDER[b.equipo] || 99;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.apellido.localeCompare(b.apellido);
  });

  return (
    <>
      <div className="page-header" style={{ alignItems: "flex-end" }}>
        <div>
          <h1>Horarios de Home Office</h1>
          <p className="page-header-sub">Marcá los días que cada persona hace Home Office. Los días desmarcados son presenciales.</p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {error && <span style={{ color: "var(--error)", fontSize: 14 }}>{error}</span>}
          {success && (
            <span style={{ color: "var(--secondary)", fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
              Guardado con éxito
            </span>
          )}
          <button className="btn-secondary" onClick={exportExcel}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
            Excel
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>picture_as_pdf</span>
            PDF
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>save</span>
            {saving ? "Guardando..." : "Guardar todo"}
          </button>
        </div>
      </div>

      <div className="content-stage">
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Miembro</th>
                <th className="hide-mobile">Equipo</th>
                {DIAS_LABORALES.map(d => (
                  <th key={d.value} style={{ textAlign: "center" }}>
                    <span className="hide-mobile">{d.label}</span>
                    <span className="show-mobile">{d.label.slice(0, 3)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {miembrosOrdenados.map(m => (
                <tr key={m.id} style={{ transition: "background 0.2s" }}>
                  <td data-label="Miembro" style={{ fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                      <span>{m.apellido}, {m.nombre}</span>
                      <button className="btn-sm" onClick={() => handleCopy(m)} title="Copiar cronograma" style={{ padding: 4, minHeight: 0, color: copiedId === m.id ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copiedId === m.id ? "check" : "content_copy"}</span>
                      </button>
                    </div>
                  </td>
                  <td data-label="Equipo" className="hide-mobile" style={{ fontSize: 13, color: "var(--outline)" }}>{m.equipo || "—"}</td>
                  {DIAS_LABORALES.map(d => {
                    const isHO = draft[m.id] ? draft[m.id][d.value] : false;
                    return (
                      <td key={d.value} data-label={d.label} style={{ textAlign: "center", padding: "8px" }}>
                        <div 
                          onClick={() => handleToggle(m.id, d.value)}
                          style={{
                            display: "inline-flex", alignItems: "center", justifyContent: "center",
                            width: 36, height: 36, borderRadius: 10, cursor: "pointer",
                            transition: "all 0.15s",
                            background: isHO ? "rgba(173,198,255,0.15)" : "rgba(78,222,163,0.1)",
                            border: `1px solid ${isHO ? "rgba(173,198,255,0.4)" : "rgba(78,222,163,0.3)"}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = "brightness(1.2)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = "brightness(1)";
                          }}
                          title={isHO ? "Home Office" : "Presencial (Click para cambiar a HO)"}
                        >
                          <span className="material-symbols-outlined" style={{
                            fontSize: 20,
                            color: isHO ? "var(--primary)" : "var(--secondary)",
                            transition: "color 0.15s"
                          }}>
                            {isHO ? "home" : "domain"}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
