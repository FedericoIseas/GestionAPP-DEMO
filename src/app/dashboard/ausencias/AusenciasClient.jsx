"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

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

  async function handleImport() {
    if (!confirm("Esto va a leer el archivo 'Licencias Firma Digital.xlsx' y sumará las licencias a esta lista. ¿Continuar?")) return;
    setImporting(true);
    try {
      const res = await fetch("/api/import-ausencias", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        window.location.reload(); // Recargar para ver los datos frescos
      } else {
        alert("Error al importar: " + data.error);
      }
    } catch (e) {
      alert("Error de conexión al importar");
    } finally {
      setImporting(false);
    }
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
          <button className="btn-secondary" onClick={handleImport} disabled={importing}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>sync</span>
            {importing ? "Sincronizando..." : "Sincronizar Excel"}
          </button>
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
                  <th>Notas</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ausencias.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 500 }}>{a.miembros ? `${a.miembros.apellido}, ${a.miembros.nombre}` : "—"}</td>
                    <td><span className={`badge ${TIPO_BADGE[a.tipo] || "badge-gray"}`}>{a.tipo}</span></td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(a.fecha_inicio)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(a.fecha_fin)}</td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.notas || "—"}</td>
                    <td>
                      <div className="table-actions">
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
