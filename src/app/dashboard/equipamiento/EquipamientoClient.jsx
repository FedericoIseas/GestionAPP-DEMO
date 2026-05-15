"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const TIPOS = ["Notebook", "Monitor", "Periférico", "Software", "Otro"];
const ESTADOS = ["Disponible", "En uso", "En reparación", "Dado de baja"];
const ESTADO_BADGE = {
  "Disponible": "badge-green",
  "En uso": "badge-blue",
  "En reparación": "badge-amber",
  "Dado de baja": "badge-red",
};

const EMPTY = { nombre: "", tipo: "", marca: "", modelo: "", numero_serie: "", asignado_a: "", estado: "Disponible", notas: "" };

export default function EquipamientoClient({ equipos: initial, miembros }) {
  const [equipos, setEquipos] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  function openNew() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(e) {
    setEditing(e);
    setForm({
      nombre: e.nombre, tipo: e.tipo || "", marca: e.marca || "",
      modelo: e.modelo || "", numero_serie: e.numero_serie || "",
      asignado_a: e.asignado_a || "", estado: e.estado || "Disponible", notas: e.notas || "",
    });
    setShowModal(true);
  }

  async function handleSave(ev) {
    ev.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = { ...form, asignado_a: form.asignado_a || null };

    if (editing) {
      const { data } = await supabase.from("equipamiento").update(payload).eq("id", editing.id).select("*, miembros(nombre, apellido)").single();
      if (data) setEquipos(prev => prev.map(e => e.id === data.id ? data : e));
    } else {
      const { data } = await supabase.from("equipamiento").insert([payload]).select("*, miembros(nombre, apellido)").single();
      if (data) setEquipos(prev => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    }
    setSaving(false);
    setShowModal(false);
  }

  async function handleDelete(e) {
    if (!confirm(`¿Dar de baja "${e.nombre}"?`)) return;
    const supabase = createClient();
    await supabase.from("equipamiento").update({ activo: false }).eq("id", e.id);
    setEquipos(prev => prev.filter(x => x.id !== e.id));
  }

  const filtered = equipos.filter(e =>
    `${e.nombre} ${e.tipo || ""} ${e.marca || ""} ${e.estado || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Equipamiento</h1>
          <p className="page-header-sub">{equipos.length} items activos</p>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
          Nuevo equipo
        </button>
      </div>

      <div className="content-stage">
        {equipos.length > 0 && (
          <div style={{ maxWidth: 400 }}>
            <div className="input-wrapper">
              <div className="input-icon"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span></div>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, tipo, marca..." className="form-input" />
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="data-table-wrapper">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">inventory_2</span>
              <div className="empty-state-title">{equipos.length === 0 ? "Sin equipamiento" : "Sin resultados"}</div>
              <div className="empty-state-desc">{equipos.length === 0 ? "Agregá el primer equipo para empezar." : "Probá otro término."}</div>
              {equipos.length === 0 && <button className="btn-primary" onClick={openNew}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>Agregar</button>}
            </div>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Marca / Modelo</th>
                  <th>N° Serie</th>
                  <th>Asignado a</th>
                  <th>Estado</th>
                  <th style={{ width: 100 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 500 }}>{e.nombre}</td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>{e.tipo || "—"}</td>
                    <td style={{ color: "var(--on-surface-variant)", fontSize: 13 }}>{[e.marca, e.modelo].filter(Boolean).join(" ") || "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--on-surface-variant)" }}>{e.numero_serie || "—"}</td>
                    <td style={{ fontSize: 13 }}>{e.miembros ? `${e.miembros.apellido}, ${e.miembros.nombre}` : <span style={{ color: "var(--outline)" }}>Sin asignar</span>}</td>
                    <td><span className={`badge ${ESTADO_BADGE[e.estado] || "badge-gray"}`}>{e.estado}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn-sm" onClick={() => openEdit(e)}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span></button>
                        <button className="btn-sm" onClick={() => handleDelete(e)} style={{ color: "var(--error)" }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span></button>
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
            <h2 className="modal-title">{editing ? "Editar equipo" : "Nuevo equipo"}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" required value={form.nombre} onChange={ev => setForm({ ...form, nombre: ev.target.value })}
                  className="form-input-clean" placeholder="Notebook Dell Latitude" />
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select value={form.tipo} onChange={ev => setForm({ ...form, tipo: ev.target.value })} className="form-select">
                    <option value="">Seleccionar</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select value={form.estado} onChange={ev => setForm({ ...form, estado: ev.target.value })} className="form-select">
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Marca</label>
                  <input type="text" value={form.marca} onChange={ev => setForm({ ...form, marca: ev.target.value })} className="form-input-clean" placeholder="Dell" />
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo</label>
                  <input type="text" value={form.modelo} onChange={ev => setForm({ ...form, modelo: ev.target.value })} className="form-input-clean" placeholder="Latitude 5540" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">N° de serie</label>
                <input type="text" value={form.numero_serie} onChange={ev => setForm({ ...form, numero_serie: ev.target.value })} className="form-input-clean" placeholder="SN-XXXXXXXXX" />
              </div>
              <div className="form-group">
                <label className="form-label">Asignado a</label>
                <select value={form.asignado_a} onChange={ev => setForm({ ...form, asignado_a: ev.target.value })} className="form-select">
                  <option value="">Sin asignar</option>
                  {miembros.map(m => <option key={m.id} value={m.id}>{m.apellido}, {m.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input type="text" value={form.notas} onChange={ev => setForm({ ...form, notas: ev.target.value })} className="form-input-clean" placeholder="Observaciones..." />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : (editing ? "Guardar" : "Crear")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
