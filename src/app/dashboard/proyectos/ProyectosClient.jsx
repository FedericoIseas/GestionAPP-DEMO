"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import CustomSelect from "@/components/ui/CustomSelect";
import * as XLSX from "xlsx";

const ESTADOS = ["Pendiente", "En curso", "Completado", "Pausado"];
const ESTADO_BADGE = {
  "Pendiente": "badge-gray",
  "En curso": "badge-blue",
  "Completado": "badge-green",
  "Pausado": "badge-amber",
};

const EQUIPOS = ["Director", "Coordinación", "Técnicos", "Expedientes", "Oficiales de Registro", "Analista Legal"];

const EMPTY = { nombre: "", descripcion: "", miembro_id: "", equipo_asignado: "", estado: "Pendiente", fecha_limite: "" };

function formatDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ProyectosClient({ proyectos: initial, miembros }) {
  const [proyectos, setProyectos] = useState(initial);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  // Notas
  const [notasModal, setNotasModal] = useState(null); // proyecto seleccionado
  const [notas, setNotas] = useState([]);
  const [nuevaNota, setNuevaNota] = useState("");
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [savingNota, setSavingNota] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  function handleCopy(p) {
    const responsable = p.equipo_asignado
      ? `${p.equipo_asignado} (Equipo)`
      : p.miembros
      ? `${p.miembros.apellido}, ${p.miembros.nombre}`
      : "Sin asignar";
    
    const ultimaNota = p.notas_proyecto && p.notas_proyecto.length > 0
      ? p.notas_proyecto[0].contenido
      : "—";

    const text = `📋 Detalles de Tarea
──────────────────────────────
• Tarea: ${p.nombre}
• Descripción: ${p.descripcion || "—"}
• Responsable: ${responsable}
• Estado: ${p.estado}
• Fecha Límite: ${formatDate(p.fecha_limite)}
• Última Nota: ${ultimaNota}`;

    navigator.clipboard.writeText(text);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportExcel() {
    const data = proyectos.map(p => ({
      "Tarea": p.nombre,
      "Descripción": p.descripcion || "",
      "Responsable": p.equipo_asignado ? `${p.equipo_asignado} (Equipo)` : p.miembros ? `${p.miembros.apellido}, ${p.miembros.nombre}` : "Sin asignar",
      "Estado": p.estado,
      "Fecha Límite": p.fecha_limite,
      "Última Nota": p.notas_proyecto && p.notas_proyecto.length > 0 ? p.notas_proyecto[0].contenido : ""
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tareas");
    XLSX.writeFile(workbook, "Listado_Tareas.xlsx");
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (deleting) setDeleting(null);
        else if (notasModal) setNotasModal(null);
        else if (showModal) setShowModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, notasModal]);

  function openNew() { setEditing(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(p) {
    setEditing(p);
    setForm({
      nombre: p.nombre, descripcion: p.descripcion || "",
      miembro_id: p.miembro_id || "", equipo_asignado: p.equipo_asignado || "", estado: p.estado || "Pendiente",
      fecha_limite: p.fecha_limite || "",
    });
    setShowModal(true);
  }

  async function handleSave(ev) {
    ev.preventDefault();
    setSaving(true);
    const supabase = createClient();
    const payload = { ...form, miembro_id: form.miembro_id || null, equipo_asignado: form.equipo_asignado || null, fecha_limite: form.fecha_limite || null };

    if (editing) {
      const { data } = await supabase.from("proyectos").update(payload).eq("id", editing.id).select("*, miembros(nombre, apellido)").single();
      if (data) setProyectos(prev => prev.map(p => p.id === data.id ? data : p));
    } else {
      const { data } = await supabase.from("proyectos").insert([payload]).select("*, miembros(nombre, apellido)").single();
      if (data) setProyectos(prev => [data, ...prev]);
    }
    setSaving(false);
    setShowModal(false);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const supabase = createClient();
    await supabase.from("proyectos").update({ activo: false }).eq("id", deleting.id);
    setProyectos(prev => prev.filter(x => x.id !== deleting.id));
    setDeleting(null);
  }

  async function marcarCompletado(p) {
    if (p.estado === "Completado") return;
    const supabase = createClient();
    const { data } = await supabase.from("proyectos").update({ estado: "Completado" }).eq("id", p.id).select("*, miembros(nombre, apellido)").single();
    if (data) setProyectos(prev => prev.map(x => x.id === data.id ? { ...data, notas_proyecto: x.notas_proyecto } : x));
  }

  // --- Notas ---
  async function openNotas(proyecto) {
    setNotasModal(proyecto);
    setNuevaNota("");
    setLoadingNotas(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notas_proyecto")
      .select("*")
      .eq("proyecto_id", proyecto.id)
      .order("created_at", { ascending: false });
    setNotas(data || []);
    setLoadingNotas(false);
  }

  async function agregarNota(ev) {
    ev.preventDefault();
    if (!nuevaNota.trim()) return;
    setSavingNota(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("notas_proyecto")
      .insert([{ proyecto_id: notasModal.id, contenido: nuevaNota.trim() }])
      .select()
      .single();
    if (data) {
      setNotas(prev => [data, ...prev]);
      setProyectos(prev => prev.map(p => p.id === notasModal.id ? { ...p, notas_proyecto: [data, ...(p.notas_proyecto || [])] } : p));
    }
    setNuevaNota("");
    setSavingNota(false);
  }

  async function borrarNota(notaId) {
    const supabase = createClient();
    await supabase.from("notas_proyecto").delete().eq("id", notaId);
    setNotas(prev => prev.filter(n => n.id !== notaId));
    setProyectos(prev => prev.map(p => p.id === notasModal.id ? { ...p, notas_proyecto: (p.notas_proyecto || []).filter(n => n.id !== notaId) } : p));
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tareas</h1>
          <p className="page-header-sub">{proyectos.length} tareas activas</p>
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
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>add_circle</span>
            Nueva tarea
          </button>
        </div>
      </div>

      <div className="content-stage">
        {proyectos.length === 0 ? (
          <div className="data-table-wrapper">
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">task</span>
              <div className="empty-state-title">Sin tareas</div>
              <div className="empty-state-desc">Creá tu primera tarea para comenzar a organizar el trabajo.</div>
              <button className="btn-primary" onClick={openNew}><span className="material-symbols-outlined" style={{ fontSize: 20 }}>add</span>Crear tarea</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            {/* Activos agrupados por equipo */}
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>Tareas Activas por Equipo</h2>
              {(() => {
                const activos = proyectos.filter(p => p.estado !== "Completado");
                if (activos.length === 0) {
                  return (
                    <div style={{ padding: 24, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.05)", textAlign: "center", color: "var(--on-surface-variant)" }}>
                      No hay tareas activas.
                    </div>
                  );
                }

                const getTeam = (p) => {
                  if (p.equipo_asignado) return p.equipo_asignado;
                  if (p.miembros && p.miembros.equipo) return p.miembros.equipo;
                  return "Sin equipo / General";
                };

                const agrupadas = activos.reduce((acc, p) => {
                  const t = getTeam(p);
                  if (!acc[t]) acc[t] = [];
                  acc[t].push(p);
                  return acc;
                }, {});

                const equiposOrdenados = Object.keys(agrupadas).sort((a, b) => {
                  const idxA = EQUIPOS.indexOf(a);
                  const idxB = EQUIPOS.indexOf(b);
                  if (idxA === -1 && idxB === -1) return a.localeCompare(b);
                  if (idxA === -1) return 1;
                  if (idxB === -1) return -1;
                  return idxA - idxB;
                });

                return equiposOrdenados.map(equipoNombre => (
                  <div key={equipoNombre} style={{ marginBottom: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 500, color: "var(--primary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>group</span>
                      {equipoNombre} ({agrupadas[equipoNombre].length})
                    </h3>
                    <div className="data-table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tarea</th>
                            <th>Responsable</th>
                            <th>Estado</th>
                            <th className="hide-mobile">Última actualización</th>
                            <th>Fecha límite</th>
                            <th style={{ width: 140 }}>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agrupadas[equipoNombre].map(p => {
                            const ultimaNota = p.notas_proyecto && p.notas_proyecto.length > 0 ? p.notas_proyecto[0] : null;
                            return (
                            <tr key={p.id}>
                              <td data-label="Tarea">
                                <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                                {p.descripcion && <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>{p.descripcion}</div>}
                              </td>
                              <td data-label="Responsable" style={{ fontSize: 13 }}>
                                {p.equipo_asignado ? (
                                  <span style={{ fontWeight: 600, color: "var(--primary)" }}>{p.equipo_asignado} (Equipo)</span>
                                ) : p.miembros ? (
                                  `${p.miembros.apellido}, ${p.miembros.nombre}`
                                ) : (
                                  <span style={{ color: "var(--outline)" }}>Sin asignar</span>
                                )}
                              </td>
                              <td data-label="Estado"><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{p.estado}</span></td>
                              <td data-label="Actualización" className="hide-mobile" style={{ maxWidth: 250 }}>
                                {ultimaNota ? (
                                  <div style={{ cursor: "pointer" }} onClick={() => openNotas(p)}>
                                    <div style={{
                                      fontSize: 13, color: "var(--on-surface)",
                                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>
                                      {ultimaNota.contenido}
                                    </div>
                                    <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--outline)", marginTop: 2 }}>
                                      {formatDateTime(ultimaNota.created_at)}
                                    </div>
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--outline)", fontSize: 13, cursor: "pointer" }} onClick={() => openNotas(p)}>
                                    Sin notas — clic para agregar
                                  </span>
                                )}
                              </td>
                              <td data-label="Límite" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(p.fecha_limite)}</td>
                              <td data-label="Acciones">
                                <div className="table-actions">
                                  <button className="btn-sm" onClick={() => handleCopy(p)} title="Copiar tarea" style={{ color: copiedId === p.id ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{copiedId === p.id ? "check" : "content_copy"}</span>
                                  </button>
                                  {p.estado !== "Completado" && (
                                    <button className="btn-sm" onClick={() => marcarCompletado(p)} title="Marcar completado" style={{ color: "var(--primary)" }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                                    </button>
                                  )}
                                  <button className="btn-sm" onClick={() => openNotas(p)} title="Notas" style={{ color: "var(--tertiary)" }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sticky_note_2</span>
                                  </button>
                                  <button className="btn-sm" onClick={() => openEdit(p)} title="Editar">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                                  </button>
                                  <button className="btn-sm" onClick={() => setDeleting(p)} style={{ color: "var(--error)" }} title="Eliminar">
                                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Completados */}
            {proyectos.filter(p => p.estado === "Completado").length > 0 && (
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16 }}>Tareas Completadas</h2>
                <div className="data-table-wrapper" style={{ opacity: 0.8 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tarea</th>
                        <th>Responsable</th>
                        <th>Estado</th>
                        <th className="hide-mobile">Última actualización</th>
                        <th>Fecha límite</th>
                        <th style={{ width: 140 }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proyectos.filter(p => p.estado === "Completado").map(p => {
                        const ultimaNota = p.notas_proyecto && p.notas_proyecto.length > 0 ? p.notas_proyecto[0] : null;
                        return (
                        <tr key={p.id}>
                          <td data-label="Tarea">
                            <div style={{ fontWeight: 500 }}>{p.nombre}</div>
                            {p.descripcion && <div style={{ fontSize: 12, color: "var(--on-surface-variant)", marginTop: 2 }}>{p.descripcion}</div>}
                          </td>
                          <td data-label="Responsable" style={{ fontSize: 13 }}>
                            {p.equipo_asignado ? (
                              <span style={{ fontWeight: 600, color: "var(--primary)" }}>{p.equipo_asignado} (Equipo)</span>
                            ) : p.miembros ? (
                              `${p.miembros.apellido}, ${p.miembros.nombre}`
                            ) : (
                              <span style={{ color: "var(--outline)" }}>Sin asignar</span>
                            )}
                          </td>
                          <td data-label="Estado"><span className={`badge ${ESTADO_BADGE[p.estado] || "badge-gray"}`}>{p.estado}</span></td>
                          <td data-label="Actualización" className="hide-mobile" style={{ maxWidth: 250 }}>
                            {ultimaNota ? (
                              <div style={{ cursor: "pointer" }} onClick={() => openNotas(p)}>
                                <div style={{
                                  fontSize: 13, color: "var(--on-surface)",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {ultimaNota.contenido}
                                </div>
                                <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--outline)", marginTop: 2 }}>
                                  {formatDateTime(ultimaNota.created_at)}
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: "var(--outline)", fontSize: 13, cursor: "pointer" }} onClick={() => openNotas(p)}>
                                Sin notas — clic para agregar
                              </span>
                            )}
                          </td>
                          <td data-label="Límite" style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{formatDate(p.fecha_limite)}</td>
                          <td data-label="Acciones">
                            <div className="table-actions">
                              <button className="btn-sm" onClick={() => handleCopy(p)} title="Copiar tarea" style={{ color: copiedId === p.id ? "var(--secondary)" : "var(--on-surface-variant)" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{copiedId === p.id ? "check" : "content_copy"}</span>
                              </button>
                              <button className="btn-sm" onClick={() => openNotas(p)} title="Notas" style={{ color: "var(--tertiary)" }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sticky_note_2</span>
                              </button>
                              <button className="btn-sm" onClick={() => openEdit(p)} title="Editar">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                              </button>
                              <button className="btn-sm" onClick={() => setDeleting(p)} style={{ color: "var(--error)" }} title="Eliminar">
                                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal crear/editar tarea */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={ev => ev.stopPropagation()}>
            <h2 className="modal-title">{editing ? "Editar tarea" : "Nueva tarea"}</h2>
            <form onSubmit={handleSave}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input type="text" required value={form.nombre} onChange={ev => setForm({ ...form, nombre: ev.target.value })}
                  className="form-input-clean" placeholder="Nombre de la tarea" />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input type="text" value={form.descripcion} onChange={ev => setForm({ ...form, descripcion: ev.target.value })}
                  className="form-input-clean" placeholder="Breve descripción..." />
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <div className="form-group">
                  <label className="form-label">Asignar a Equipo</label>
                  <CustomSelect
                    value={form.equipo_asignado}
                    onChange={ev => setForm({ ...form, equipo_asignado: ev.target.value, miembro_id: "" })}
                    options={EQUIPOS.map(e => ({ value: e, label: e }))}
                    placeholder="Ninguno"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">O Asignar a Persona</label>
                  <CustomSelect
                    value={form.miembro_id}
                    onChange={ev => setForm({ ...form, miembro_id: ev.target.value, equipo_asignado: "" })}
                    options={miembros.map(m => ({ value: m.id, label: `${m.apellido}, ${m.nombre}` }))}
                    placeholder="Sin asignar"
                    disabled={!!form.equipo_asignado}
                  />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 24 }}>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <CustomSelect
                    value={form.estado}
                    onChange={ev => setForm({ ...form, estado: ev.target.value })}
                    options={ESTADOS.map(e => ({ value: e, label: e }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha límite</label>
                  <input type="date" value={form.fecha_limite} onChange={ev => setForm({ ...form, fecha_limite: ev.target.value })} className="form-input-clean" />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : (editing ? "Guardar" : "Crear")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal notas del proyecto */}
      {notasModal && (
        <div className="modal-overlay" onClick={() => setNotasModal(null)}>
          <div className="modal" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 600 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h2 className="modal-title" style={{ marginBottom: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, verticalAlign: "middle", marginRight: 8, color: "var(--tertiary)" }}>sticky_note_2</span>
                  Notas
                </h2>
                <p style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>{notasModal.nombre}</p>
              </div>
              <button onClick={() => setNotasModal(null)} style={{ background: "none", border: "none", color: "var(--on-surface-variant)", cursor: "pointer", padding: 4 }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Agregar nota */}
            <form onSubmit={agregarNota} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
              <input
                type="text"
                value={nuevaNota}
                onChange={e => setNuevaNota(e.target.value)}
                placeholder="Escribí una actualización..."
                className="form-input-clean"
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn-primary" disabled={savingNota || !nuevaNota.trim()} style={{ whiteSpace: "nowrap" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span>
              </button>
            </form>

            {/* Historial */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {loadingNotas ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--on-surface-variant)" }}>Cargando...</div>
              ) : notas.length === 0 ? (
                <div style={{ textAlign: "center", padding: 32, color: "var(--outline)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, display: "block" }}>speaker_notes_off</span>
                  Sin notas todavía. Agregá la primera arriba.
                </div>
              ) : (
                notas.map((nota, i) => (
                  <div key={nota.id} style={{
                    padding: "12px 16px",
                    background: i === 0 ? "rgba(173,198,255,0.08)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${i === 0 ? "rgba(173,198,255,0.15)" : "rgba(255,255,255,0.04)"}`,
                    borderRadius: 12,
                    marginBottom: 8,
                    position: "relative",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <p style={{ fontSize: 14, color: "var(--on-surface)", lineHeight: 1.5, flex: 1 }}>{nota.contenido}</p>
                      <button onClick={() => borrarNota(nota.id)} style={{
                        background: "none", border: "none", color: "var(--outline)",
                        cursor: "pointer", padding: 2, flexShrink: 0, transition: "color 0.2s",
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--error)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--outline)"}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                    <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--outline)", marginTop: 6 }}>
                      {formatDateTime(nota.created_at)}
                      {i === 0 && <span style={{ color: "var(--primary)", marginLeft: 8 }}>• Última</span>}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar */}
      {deleting && (
        <div className="modal-overlay" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={ev => ev.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: "var(--error)", marginBottom: 16 }}>warning</span>
            <h2 className="modal-title" style={{ marginBottom: 8, justifyContent: "center" }}>¿Eliminar tarea?</h2>
            <p style={{ color: "var(--on-surface-variant)", marginBottom: 24, fontSize: 14 }}>
              Estás por eliminar la tarea <strong>"{deleting.nombre}"</strong>. Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions" style={{ justifyContent: "center" }}>
              <button className="btn-secondary" onClick={() => setDeleting(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: "var(--error)", color: "white", borderColor: "var(--error)" }} onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
