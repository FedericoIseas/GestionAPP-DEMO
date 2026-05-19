"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

const EQUIPOS = ["Director", "Coordinación", "Técnicos", "Expedientes", "Oficiales de Registro", "Analista Legal"];
const EQUIPO_BADGE = {
  "Director": "badge-red",
  "Coordinación": "badge-blue",
  "Técnicos": "badge-blue",
  "Expedientes": "badge-amber",
  "Oficiales de Registro": "badge-green",
  "Analista Legal": "badge-gray",
};
const EQUIPO_ORDER = {
  "Director": 1,
  "Coordinación": 2,
  "Técnicos": 3,
  "Expedientes": 4,
  "Oficiales de Registro": 5,
  "Analista Legal": 6
};

const EMPTY = { nombre: "", apellido: "", cuit: "", email_laboral: "", email_google: "", equipo: "", puesto: "" };

export default function PersonalClient({ miembros: initialMiembros }) {
  const router = useRouter();
  const [miembros, setMiembros] = useState(initialMiembros);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  function handleCopy(m) {
    const text = `📋 Información de Miembro
──────────────────────────────
• Nombre: ${m.apellido}, ${m.nombre}
• Puesto: ${m.puesto || "—"}
• Equipo: ${m.equipo || "—"}
• CUIT: ${m.cuit || "—"}
• Email: ${m.email_laboral || "—"}`;

    navigator.clipboard.writeText(text);
    setCopiedId(m.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportExcel() {
    const data = miembros.map(mem => ({
      "Apellido": mem.apellido,
      "Nombre": mem.nombre,
      "Puesto": mem.puesto || "",
      "Equipo": mem.equipo || "",
      "CUIT": mem.cuit || "",
      "Email Laboral": mem.email_laboral || "",
      "Email Google": mem.email_google || ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Personal");
    XLSX.writeFile(workbook, "Listado_Personal.xlsx");
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setError(null);
    setShowModal(true);
  }

  function openEdit(m) {
    setEditing(m);
    setForm({
      nombre: m.nombre, apellido: m.apellido,
      cuit: m.cuit || "", email_laboral: m.email_laboral || "",
      email_google: m.email_google || "", equipo: m.equipo || "",
      puesto: m.puesto || "",
    });
    setError(null);
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);

    // Validación client-side
    const faltantes = [];
    if (!form.nombre.trim()) faltantes.push("Nombre");
    if (!form.apellido.trim()) faltantes.push("Apellido");
    if (!form.puesto.trim()) faltantes.push("Puesto");
    if (!form.cuit.trim()) faltantes.push("CUIT");
    if (!form.equipo) faltantes.push("Equipo");

    if (faltantes.length > 0) {
      setError(`Completá los campos obligatorios: ${faltantes.join(", ")}`);
      return;
    }

    setSaving(true);
    const supabase = createClient();

    if (editing) {
      const { data, error: dbError } = await supabase
        .from("miembros")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editing.id)
        .select()
        .single();

      if (dbError) {
        setError(dbError.message);
        setSaving(false);
        return;
      }
      if (data) setMiembros(prev => prev.map(m => m.id === data.id ? data : m));
    } else {
      const { data, error: dbError } = await supabase
        .from("miembros")
        .insert([form])
        .select()
        .single();

      if (dbError) {
        setError(dbError.message);
        setSaving(false);
        return;
      }
      if (data) setMiembros(prev => [...prev, data].sort((a, b) => a.apellido.localeCompare(b.apellido)));
    }

    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(m) {
    if (!confirm(`¿Dar de baja a ${m.nombre} ${m.apellido}?`)) return;
    const supabase = createClient();
    await supabase.from("miembros").update({ activo: false }).eq("id", m.id);
    setMiembros(prev => prev.filter(x => x.id !== m.id));
  }

  const filtered = miembros.filter(m =>
    `${m.nombre} ${m.apellido} ${m.equipo || ""}`.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    const ordenA = EQUIPO_ORDER[a.equipo] || 99;
    const ordenB = EQUIPO_ORDER[b.equipo] || 99;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return a.apellido.localeCompare(b.apellido);
  });

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Personal</h1>
          <p className="page-header-sub">{miembros.length} miembros activos</p>
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
          <button className="btn-primary" onClick={openNew}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
            Nuevo miembro
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content-stage">
        {/* Search */}
        {miembros.length > 0 && (
          <div style={{ maxWidth: 400 }}>
            <div className="input-wrapper">
              <div className="input-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o equipo..."
                className="form-input"
              />
            </div>
          </div>
        )}

        {/* Table or empty */}
        {filtered.length === 0 ? (
          <div className="data-table-wrapper">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">group</span>
              <div className="empty-state-title">
                {miembros.length === 0 ? "No hay miembros aún" : "Sin resultados"}
              </div>
              <div className="empty-state-desc">
                {miembros.length === 0
                  ? "Hacé clic en \"Nuevo miembro\" para agregar al primero."
                  : "Probá con otro término de búsqueda."}
              </div>
              {miembros.length === 0 && (
                <button className="btn-primary" onClick={openNew}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
                  Agregar miembro
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Puesto</th>
                  <th className="hide-mobile">CUIT</th>
                  <th className="hide-mobile">Email laboral</th>
                  <th>Equipo</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td data-label="Nombre" style={{ fontWeight: 500 }}>{m.apellido}, {m.nombre}</td>
                    <td data-label="Puesto" style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>{m.puesto || "—"}</td>
                    <td data-label="CUIT" className="hide-mobile" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--on-surface-variant)" }}>
                      {m.cuit || "—"}
                    </td>
                    <td data-label="Email" className="hide-mobile" style={{ color: "var(--on-surface-variant)" }}>{m.email_laboral || "—"}</td>
                    <td data-label="Equipo">
                      {m.equipo ? (
                        <span className={`badge ${EQUIPO_BADGE[m.equipo] || "badge-gray"}`}>{m.equipo}</span>
                      ) : (
                        <span style={{ color: "var(--outline)" }}>—</span>
                      )}
                    </td>
                    <td data-label="Acciones">
                      <div className="table-actions">
                        <button className="btn-sm" onClick={() => handleCopy(m)} title="Copiar información" style={{ color: copiedId === m.id ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{copiedId === m.id ? "check" : "content_copy"}</span>
                        </button>
                        <button className="btn-sm" onClick={() => openEdit(m)} title="Editar">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                        </button>
                        <button className="btn-sm" onClick={() => handleDelete(m)} title="Dar de baja"
                          style={{ color: "var(--error)" }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,180,171,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "none"}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_off</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">
              {editing ? "Editar miembro" : "Nuevo miembro"}
            </h2>
            <form onSubmit={handleSave}>
              {error && (
                <div className="error-box" style={{ marginBottom: 20 }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--error)", fontSize: 18, flexShrink: 0 }}>error</span>
                  <p className="error-text">{error}</p>
                </div>
              )}
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input type="text" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                    className="form-input-clean" placeholder="Juan" />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido *</label>
                  <input type="text" required value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })}
                    className="form-input-clean" placeholder="Pérez" />
                </div>
              </div>



              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Puesto *</label>
                  <input type="text" required value={form.puesto} onChange={e => setForm({ ...form, puesto: e.target.value })}
                    className="form-input-clean" placeholder="Ej: Analista, Jefe de área..." />
                </div>
                <div className="form-group">
                  <label className="form-label">CUIT *</label>
                  <input type="text" required value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })}
                    className="form-input-clean" placeholder="20-12345678-9" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email laboral</label>
                <input type="email" value={form.email_laboral} onChange={e => setForm({ ...form, email_laboral: e.target.value })}
                  className="form-input-clean" placeholder="juan@empresa.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Email Google (Drive)</label>
                <input type="email" value={form.email_google} onChange={e => setForm({ ...form, email_google: e.target.value })}
                  className="form-input-clean" placeholder="juan@gmail.com" />
              </div>

              <div className="form-group">
                <label className="form-label">Equipo *</label>
                <select required value={form.equipo} onChange={e => setForm({ ...form, equipo: e.target.value })} className="form-select">
                  <option value="">Seleccionar equipo</option>
                  {EQUIPOS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Guardando..." : (editing ? "Guardar cambios" : "Crear miembro")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
