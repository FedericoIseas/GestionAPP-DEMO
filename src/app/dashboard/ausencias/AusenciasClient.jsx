"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";

const TIPOS = ["Vacaciones", "Licencia", "Ausencia", "Feriado", "Otro"];
const TIPO_BADGE = {
  "Vacaciones": "badge-blue",
  "Licencia": "badge-amber",
  "Ausencia": "badge-red",
  "Feriado": "badge-green",
  "Otro": "badge-gray",
};

const EMPTY = { miembro_id: "", tipo: "", fecha_inicio: "", fecha_fin: "", notas: "" };

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AusenciasClient({ ausencias: initial, miembros }) {
  const router = useRouter();
  const [ausencias, setAusencias] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  function handleCopy(a) {
    const miembro = a.miembros ? `${a.miembros.apellido}, ${a.miembros.nombre}` : "—";
    const text = `📋 Registro de Ausencia
──────────────────────────────
• Miembro: ${miembro}
• Tipo: ${a.tipo}
• Desde: ${formatDate(a.fecha_inicio)}
• Hasta: ${formatDate(a.fecha_fin)}
• Notas: ${a.notas || "—"}`;

    navigator.clipboard.writeText(text);
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportExcel() {
    const data = ausencias.map(aus => ({
      "Miembro": aus.miembros ? `${aus.miembros.apellido}, ${aus.miembros.nombre}` : "—",
      "Tipo": aus.tipo,
      "Fecha Inicio": aus.fecha_inicio,
      "Fecha Fin": aus.fecha_fin,
      "Notas": aus.notas || ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ausencias");
    XLSX.writeFile(workbook, "Listado_Ausencias.xlsx");
  }

  const fileInputRef = useRef(null);

  function triggerFileInput() {
    fileInputRef.current.click();
  }

  function formatExcelDate(serial) {
    if (!serial) return "";
    if (typeof serial !== "number") {
      const str = String(serial).trim();
      if (str.includes("/")) {
        const parts = str.split("/");
        if (parts.length === 3) {
          const day = parts[0].padStart(2, "0");
          const month = parts[1].padStart(2, "0");
          const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
          return `${year}-${month}-${day}`;
        }
      }
      return str;
    }
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });

        if (!workbook.SheetNames.includes("FSOLI")) {
          alert("Error: El Excel cargado no contiene la pestaña 'FSOLI'.");
          setImporting(false);
          return;
        }

        const raw = XLSX.utils.sheet_to_json(workbook.Sheets["FSOLI"], { header: 1 });
        if (raw.length <= 1) {
          alert("Error: La pestaña 'FSOLI' está vacía.");
          setImporting(false);
          return;
        }

        const rows = raw.slice(1);

        // Normalizador de nombres
        const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

        const registrosNuevos = [];
        const agentesNoEncontrados = new Set();

        for (const row of rows) {
          const agenteStr = row[3] || "";
          if (!agenteStr) continue;

          const desdeStr = formatExcelDate(row[0]);
          const tipoStrOrig = row[2] || "";
          const ccooStr = row[12] || "";
          const observacionesStr = row[13] || "";

          // Ignorar si no tiene fechas o es comisión
          if (!desdeStr || !desdeStr.includes("-") || tipoStrOrig.toLowerCase().includes("comisión")) {
            continue;
          }

          // Buscar el miembro correspondiente en la DB
          const ag = normalize(agenteStr);
          const miembroEncontrado = miembros.find(m => ag.includes(normalize(m.apellido)) || ag.includes(normalize(m.nombre)));

          if (!miembroEncontrado) {
            agentesNoEncontrados.add(agenteStr);
            continue;
          }

          let tipoFinal = "Otro";
          const tLower = tipoStrOrig.toLowerCase();
          if (tLower.includes("lao") || tLower.includes("1109") || tLower.includes("vacaciones")) {
            tipoFinal = "Vacaciones";
          } else if (tLower.includes("13a") || tLower.includes("examen")) {
            tipoFinal = "Licencia";
          } else if (tLower.includes("14f") || tLower.includes("familiar")) {
            tipoFinal = "Ausencia";
          } else {
            tipoFinal = "Licencia";
          }

          const hastaStr = formatExcelDate(row[1]) || desdeStr;

          registrosNuevos.push({
            miembro_id: miembroEncontrado.id,
            tipo: tipoFinal,
            fecha_inicio: desdeStr,
            fecha_fin: hastaStr,
            notes: `[Excel: ${tipoStrOrig}] ${observacionesStr || ccooStr}`.trim(),
            activo: true
          });
        }

        if (registrosNuevos.length === 0) {
          alert("No se encontraron registros válidos o compatibles con los miembros cargados.");
          setImporting(false);
          return;
        }

        // Obtener ausencias existentes para deduplicar
        const supabase = createClient();
        const { data: dbAusencias } = await supabase.from("ausencias").select("miembro_id, fecha_inicio, fecha_fin");
        
        const setExistentes = new Set();
        if (dbAusencias) {
          for (const a of dbAusencias) {
            setExistentes.add(`${a.miembro_id}_${a.fecha_inicio}_${a.fecha_fin}`);
          }
        }

        // Filtrar duplicados
        const registrosUnicos = registrosNuevos.map(r => ({
          miembro_id: r.miembro_id,
          tipo: r.tipo,
          fecha_inicio: r.fecha_inicio,
          fecha_fin: r.fecha_fin,
          notas: r.notes,
          activo: r.activo
        })).filter(r => {
          const key = `${r.miembro_id}_${r.fecha_inicio}_${r.fecha_fin}`;
          if (setExistentes.has(key)) return false;
          setExistentes.add(key);
          return true;
        });

        if (registrosUnicos.length === 0) {
          let msg = "Todos los registros ya estaban sincronizados. 0 importados.";
          if (agentesNoEncontrados.size > 0) {
            msg += `\n\nAgentes en Excel no reconocidos en la base de datos:\n• ${Array.from(agentesNoEncontrados).join("\n• ")}`;
          }
          alert(msg);
          setImporting(false);
          return;
        }

        // Insertar en Supabase
        const { data: inserted, error: dbError } = await supabase
          .from("ausencias")
          .insert(registrosUnicos)
          .select("*, miembros(nombre, apellido)");

        if (dbError) {
          alert("Error al guardar en base de datos: " + dbError.message);
        } else {
          setAusencias(prev => [...inserted, ...prev]);
          
          let msg = `¡Sincronización exitosa!\n\nSe importaron ${registrosUnicos.length} registros de ausencias nuevos.`;
          if (agentesNoEncontrados.size > 0) {
            msg += `\n\nAgentes omitidos (no registrados en tu Personal):\n• ${Array.from(agentesNoEncontrados).join("\n• ")}`;
          }
          alert(msg);
        }
      } catch (err) {
        console.error(err);
        alert("Ocurrió un error leyendo el archivo Excel: " + err.message);
      } finally {
        setImporting(false);
        if (e.target) e.target.value = "";
      }
    };

    reader.onerror = () => {
      alert("Error al leer el archivo físico.");
      setImporting(false);
    };

    reader.readAsArrayBuffer(file);
  }

  function openNew() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(a) {
    setEditing(a);
    setForm({
      miembro_id: a.miembro_id || "", tipo: a.tipo || "",
      fecha_inicio: a.fecha_inicio || "", fecha_fin: a.fecha_fin || "",
      notas: a.notas || "",
    });
    setShowModal(true);
  }

  async function handleSave(ev) {
    ev.preventDefault();
    setSaving(true);
    const supabase = createClient();

    if (editing) {
      const { data } = await supabase.from("ausencias").update(form).eq("id", editing.id).select("*, miembros(nombre, apellido)").single();
      if (data) setAusencias(prev => prev.map(a => a.id === data.id ? data : a));
    } else {
      const { data } = await supabase.from("ausencias").insert([form]).select("*, miembros(nombre, apellido)").single();
      if (data) setAusencias(prev => [data, ...prev]);
    }
    setSaving(false);
    setShowModal(false);
    router.refresh();
  }

  async function handleDelete(a) {
    if (!confirm("¿Eliminar esta ausencia?")) return;
    const supabase = createClient();
    await supabase.from("ausencias").update({ activo: false }).eq("id", a.id);
    setAusencias(prev => prev.filter(x => x.id !== a.id));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Ausencias y Licencias</h1>
          <p className="page-header-sub">{ausencias.length} registradas en la base de datos</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-secondary" onClick={exportExcel}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>description</span>
            Excel
          </button>
          <button className="btn-secondary" onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>picture_as_pdf</span>
            PDF
          </button>
          <button className="btn-secondary" onClick={triggerFileInput} disabled={importing}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload_file</span>
            {importing ? "Sincronizando..." : "Sincronizar Excel"}
          </button>
          <input
            type="file"
            accept=".xlsx, .xls"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button className="btn-primary" onClick={openNew}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>
            Nueva ausencia
          </button>
        </div>
      </div>

      <div className="content-stage">
        {ausencias.length === 0 ? (
          <div className="data-table-wrapper">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">event_available</span>
              <div className="empty-state-title">Sin ausencias registradas</div>
              <div className="empty-state-desc">Cuando registres una ausencia, aparecerá acá.</div>
              <button className="btn-primary" onClick={openNew}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>Registrar
              </button>
            </div>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Tipo</th>
                  <th>Desde</th>
                  <th>Hasta</th>
                  <th className="hide-mobile">Notas</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ausencias.map(a => (
                  <tr key={a.id}>
                    <td data-label="Miembro" style={{ fontWeight: 500 }}>{a.miembros ? `${a.miembros.apellido}, ${a.miembros.nombre}` : "—"}</td>
                    <td data-label="Tipo"><span className={`badge ${TIPO_BADGE[a.tipo] || "badge-gray"}`}>{a.tipo}</span></td>
                    <td data-label="Desde" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(a.fecha_inicio)}</td>
                    <td data-label="Hasta" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(a.fecha_fin)}</td>
                    <td data-label="Notas" className="hide-mobile" style={{ color: "var(--on-surface-variant)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notas || "—"}</td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                        <button className="btn-sm" onClick={() => handleCopy(a)} title="Copiar detalles" style={{ color: copiedId === a.id ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{copiedId === a.id ? "check" : "content_copy"}</span>
                        </button>
                        <button className="btn-sm" onClick={() => openEdit(a)}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span></button>
                        <button className="btn-sm" onClick={() => handleDelete(a)} style={{ color: "var(--error)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <h2 className="modal-title">{editing ? "Editar ausencia" : "Nueva ausencia"}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Miembro *</label>
                <select required value={form.miembro_id} onChange={ev => setForm({ ...form, miembro_id: ev.target.value })} className="form-select">
                  <option value="">Seleccionar miembro</option>
                  {miembros.map(m => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo *</label>
                <select required value={form.tipo} onChange={ev => setForm({ ...form, tipo: ev.target.value })} className="form-select">
                  <option value="">Seleccionar tipo</option>
                  {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Desde *</label>
                  <input type="date" required value={form.fecha_inicio} onChange={ev => setForm({ ...form, fecha_inicio: ev.target.value })} className="form-input-clean" />
                </div>
                <div className="form-group">
                  <label className="form-label">Hasta *</label>
                  <input type="date" required value={form.fecha_fin} onChange={ev => setForm({ ...form, fecha_fin: ev.target.value })} className="form-input-clean" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input type="text" value={form.notas} onChange={ev => setForm({ ...form, notas: ev.target.value })} className="form-input-clean" placeholder="Motivo, observaciones..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : (editing ? "Guardar" : "Registrar")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
