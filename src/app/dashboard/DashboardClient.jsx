"use client";

import React, { useState, useMemo } from "react";

export default function DashboardClient({
  todosLosMiembros = [],
  todasLasAusencias = [],
  todosLosHorarios = [],
  tareasPendientes = [],
  initialDateString,
  saludo,
  fechaFormateada: initialFechaFormateada
}) {
  // Vista activa: 'diaria' o 'semanal'
  const [viewMode, setViewMode] = useState("diaria");

  // Fecha seleccionada (inicializada a la fecha de hoy local)
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDateString) {
      return new Date(initialDateString + "T12:00:00");
    }
    return new Date();
  });

  // Convertir fecha seleccionada a YYYY-MM-DD en zona local
  const getYYYYMMDD = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const selectedDateString = useMemo(() => getYYYYMMDD(selectedDate), [selectedDate]);

  // Obtener lunes de la semana seleccionada
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(12, 0, 0, 0);
    return monday;
  };

  const currentMonday = useMemo(() => getMonday(selectedDate), [selectedDate]);

  // Obtener los 5 días hábiles de la semana (Lunes a Viernes)
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(currentMonday);
      d.setDate(currentMonday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentMonday]);

  // Navegar tiempo
  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleDateChange = (e) => {
    if (!e.target.value) return;
    const newDate = new Date(e.target.value + "T12:00:00");
    setSelectedDate(newDate);
  };

  // Formateadores de fecha
  const formatDayName = (date) => {
    const label = date.toLocaleDateString("es-AR", { weekday: "short" });
    return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
  };

  const formatDayNum = (date) => {
    return date.getDate();
  };

  const formatDateRange = () => {
    const start = weekDays[0];
    const end = weekDays[4];
    const startStr = start.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
    const endStr = end.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
    return `${startStr} - ${endStr}`;
  };

  const formatDateLabel = (dStr) => {
    if (!dStr) return "—";
    return new Date(dStr + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  };

  // ==========================================
  // CÁLCULO DE ESTADOS PARA UN DÍA DETERMINADO
  // ==========================================
  const getDayAttendance = (dateString, dayOfWeekIndex) => {
    // 1. Ausentes
    const ausentes = todasLasAusencias.filter(a =>
      a.activo && dateString >= a.fecha_inicio && dateString <= a.fecha_fin
    );
    const ausentesIds = ausentes.map(a => a.miembro_id);

    // 2. Home Office
    const homeOffice = todosLosHorarios.filter(h =>
      h.activo && h.dia_semana === dayOfWeekIndex && h.es_home_office && !ausentesIds.includes(h.miembro_id)
    );
    const hoIds = homeOffice.map(h => h.miembro_id);

    // 3. Oficina OR
    const ORsEnOficina = todosLosMiembros.filter(m =>
      m.equipo === "Oficiales de Registro" && !ausentesIds.includes(m.id) && !hoIds.includes(m.id)
    );

    // 4. Resto del Equipo en Oficina
    const restoEnOficina = todosLosMiembros.filter(m =>
      m.equipo !== "Oficiales de Registro" && !ausentesIds.includes(m.id) && !hoIds.includes(m.id)
    );

    return {
      ausentes,
      ausentesIds,
      homeOffice,
      hoIds,
      ORsEnOficina,
      restoEnOficina
    };
  };

  // Datos para el día seleccionado
  const selectedDayOfWeekIndex = selectedDate.getDay();
  const esFinDeSemanaSelected = selectedDayOfWeekIndex === 0 || selectedDayOfWeekIndex === 6;

  const dailyData = useMemo(() => {
    return getDayAttendance(selectedDateString, selectedDayOfWeekIndex);
  }, [selectedDateString, selectedDayOfWeekIndex]);

  // Stats del día seleccionado
  const stats = useMemo(() => {
    const total = todosLosMiembros.length || 0;
    if (esFinDeSemanaSelected) {
      return [
        { label: "Miembros activos", value: total, sub: "Total del equipo", pct: 100, icon: "group", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
        { label: "En oficina hoy", value: "—", sub: "Día no laboral", pct: 0, icon: "domain", color: "#4edea3", shadow: "rgba(78,222,163,0.5)" },
        { label: "Home office hoy", value: "—", sub: "Día no laboral", pct: 0, icon: "home", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
        { label: "Ausentes hoy", value: "—", sub: "Día no laboral", pct: 0, icon: "event_busy", color: "#ffb4ab", shadow: "rgba(255,180,171,0.5)" },
      ];
    }

    const aus = dailyData.ausentes.length || 0;
    const ho = dailyData.homeOffice.length || 0;
    const ofi = total - aus - ho;

    return [
      { label: "Miembros activos", value: total, sub: "Total del equipo", pct: 100, icon: "group", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
      { label: "En oficina hoy", value: ofi, sub: "Presenciales", pct: total ? (ofi / total) * 100 : 0, icon: "domain", color: "#4edea3", shadow: "rgba(78,222,163,0.5)" },
      { label: "Home office hoy", value: ho, sub: "Remotos", pct: total ? (ho / total) * 100 : 0, icon: "home", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
      { label: "Ausentes hoy", value: aus, sub: "Licencias/Vacaciones", pct: total ? (aus / total) * 100 : 0, icon: "event_busy", color: "#ffb4ab", shadow: "rgba(255,180,171,0.5)" },
    ];
  }, [todosLosMiembros, dailyData, esFinDeSemanaSelected]);

  // Próximas ausencias relativas al día seleccionado (límite 5)
  const proximasAusenciasFiltradas = useMemo(() => {
    return todasLasAusencias
      .filter(a => a.activo && a.fecha_inicio > selectedDateString)
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))
      .slice(0, 5);
  }, [todasLasAusencias, selectedDateString]);

  // ==========================================
  // DATOS DE ASISTENCIA SEMANAL ORGANIZADOS POR DÍA
  // ==========================================
  const weeklyDaysData = useMemo(() => {
    return weekDays.map((day) => {
      const dateStr = getYYYYMMDD(day);
      const dayOfWeekIdx = day.getDay();

      const { ausentes, homeOffice, ORsEnOficina, restoEnOficina } = getDayAttendance(dateStr, dayOfWeekIdx);

      return {
        dayName: formatDayName(day),
        dayNum: formatDayNum(day),
        dayDate: day,
        ausentes,
        homeOffice,
        ORsEnOficina: ORsEnOficina.sort((a, b) => a.apellido.localeCompare(b.apellido)),
        restoEnOficina: restoEnOficina.sort((a, b) => a.apellido.localeCompare(b.apellido))
      };
    });
  }, [weekDays, todasLasAusencias, todosLosHorarios, todosLosMiembros]);

  // Totales de la semana activa
  const weeklyTotals = useMemo(() => {
    let oficinaCount = 0;
    let homeCount = 0;
    let ausenteCount = 0;

    weeklyDaysData.forEach(day => {
      oficinaCount += day.ORsEnOficina.length + day.restoEnOficina.length;
      homeCount += day.homeOffice.length;
      ausenteCount += day.ausentes.length;
    });

    return { oficinaCount, homeCount, ausenteCount };
  }, [weeklyDaysData]);

  return (
    <>
      <div className="content-stage" style={{ paddingTop: 16, gap: 16 }}>
        {/* Cabecera Interactiva del Dashboard */}
        <header style={{ padding: "0 0 4px 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p className="page-header-sub" style={{ marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <span>{saludo} 👋</span>
              <span className="header-divider">|</span>
              <span style={{ color: "var(--on-surface-variant)" }}>
                {selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </span>
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--on-surface)", margin: 0 }}>Resumen</h1>
          </div>

          {/* Tab Selector de Vista (Diaria vs Semanal) */}
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, padding: 4 }}>
            <button
              onClick={() => setViewMode("diaria")}
              style={{
                padding: "8px 16px",
                borderRadius: 16,
                border: "none",
                background: viewMode === "diaria" ? "rgba(173, 198, 255, 0.15)" : "transparent",
                color: viewMode === "diaria" ? "#adc6ff" : "var(--on-surface-variant)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span>
              Vista Diaria
            </button>
            <button
              onClick={() => setViewMode("semanal")}
              style={{
                padding: "8px 16px",
                borderRadius: 16,
                border: "none",
                background: viewMode === "semanal" ? "rgba(173, 198, 255, 0.15)" : "transparent",
                color: viewMode === "semanal" ? "#adc6ff" : "var(--on-surface-variant)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>analytics</span>
              Ver Semana
            </button>
          </div>
        </header>

        {/* Panel de Controles / Navegación Temporal (Compacto) */}
        <div style={{
          background: "rgba(30,41,59,0.5)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 12,
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}>
          {/* Lado izquierdo: Controles de tiempo según la vista */}
          {viewMode === "diaria" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handlePrevDay}
                className="btn-icon"
                title="Día anterior"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              </button>

              <div style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "0 12px",
                height: 32,
                cursor: "pointer",
                boxSizing: "border-box"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#adc6ff", marginRight: 6 }}>calendar_today</span>
                <span style={{
                  color: "#adc6ff",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}>
                  {selectedDate.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <input
                  type="date"
                  value={selectedDateString}
                  onChange={handleDateChange}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer"
                  }}
                />
              </div>

              <button
                onClick={handleNextDay}
                className="btn-icon"
                title="Día siguiente"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={handlePrevWeek}
                className="btn-icon"
                title="Semana anterior"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
              </button>

              <div style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8,
                padding: "0 12px",
                height: 32,
                fontSize: 12,
                fontWeight: 600,
                color: "#adc6ff",
                fontFamily: "var(--font-mono)",
                boxSizing: "border-box"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15, color: "#adc6ff", marginRight: 6 }}>calendar_view_week</span>
                {formatDateRange()}
              </div>

              <button
                onClick={handleNextWeek}
                className="btn-icon"
                title="Semana siguiente"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--on-surface)",
                  cursor: "pointer",
                  boxSizing: "border-box"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </button>
            </div>
          )}

          {/* Lado derecho: Resumen rápido semanal (en Vista Semanal) */}
          {viewMode === "semanal" && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ color: "#4edea3", fontSize: 14 }}>domain</span>
                <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                  Presencial: <strong style={{ color: "#4edea3", fontFamily: "var(--font-mono)" }}>{weeklyTotals.oficinaCount}d</strong>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ color: "#adc6ff", fontSize: 14 }}>home</span>
                <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                  Home Office: <strong style={{ color: "#adc6ff", fontFamily: "var(--font-mono)" }}>{weeklyTotals.homeCount}d</strong>
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="material-symbols-outlined" style={{ color: "#ffb4ab", fontSize: 14 }}>event_busy</span>
                <span style={{ fontSize: 11, color: "var(--on-surface-variant)" }}>
                  Ausente: <strong style={{ color: "#ffb4ab", fontFamily: "var(--font-mono)" }}>{weeklyTotals.ausenteCount}d</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            VISTA DIARIA: 4 TARJETAS PRINCIPALES
            ======================================================== */}
        {viewMode === "diaria" && (
          <>
            {esFinDeSemanaSelected && (
              <div style={{ background: "rgba(255,185,95,0.12)", border: "1px solid rgba(255,185,95,0.3)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span className="material-symbols-outlined" style={{ color: "#ffb95f", fontSize: 28 }}>weekend</span>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--on-surface)" }}>El día seleccionado es fin de semana o feriado</div>
                  <div style={{ fontSize: 14, color: "var(--on-surface-variant)" }}>Los indicadores de asistencia corresponden al próximo día hábil laboral.</div>
                </div>
              </div>
            )}

            {!esFinDeSemanaSelected && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>

                {/* Tarjeta Estado del Equipo */}
                <div className="status-list-card" style={{ padding: 0, background: "rgba(30,41,59,0.7)", borderRadius: 12 }}>
                  <div className="status-list-header" style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#adc6ff", fontSize: 18 }}>analytics</span>
                    <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)", margin: 0 }}>Estado del Equipo</h2>
                  </div>

                  <div className="status-list-content" style={{ padding: "6px 12px" }}>
                    {stats.map((stat) => (
                      <div key={stat.label} className="status-list-item" style={{ padding: "6px 0", borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
                        <div className="status-list-item-left" style={{ gap: 8 }}>
                          <div className="status-list-icon-wrapper" style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: 14 }}>{stat.icon}</span>
                          </div>
                          <div>
                            <div className="status-list-item-title" style={{ fontSize: 12, fontWeight: 500 }}>{stat.label}</div>
                            <div className="status-list-item-subtitle" style={{ fontSize: 10, color: "var(--on-surface-variant)" }}>{stat.sub}</div>
                          </div>
                        </div>

                        <div className="status-list-item-right" style={{ gap: 8 }}>
                          <div className="status-list-progress-track" style={{ width: 40, height: 4 }}>
                            <div className="status-list-progress-bar" style={{
                              width: `${Math.min(stat.pct, 100)}%`,
                              background: stat.color,
                              boxShadow: `0 0 10px ${stat.shadow}`,
                            }} />
                          </div>
                          <span className="status-list-value" style={{ fontSize: 12, fontWeight: 600 }}>{stat.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ausencias (Hoy y Próximas) */}
                <div className="data-table-wrapper" style={{ padding: 12, background: "rgba(30,41,59,0.7)", borderRadius: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6, margin: 0, paddingBottom: 8, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#ffb4ab", fontSize: 18 }}>event_busy</span>
                    Ausencias
                  </h3>

                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Sub-sección: Hoy */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#ffb4ab", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Hoy</div>
                      {dailyData.ausentes?.length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                          {dailyData.ausentes.map(a => (
                            <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,180,171,0.2)", color: "#ffb4ab", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>
                                {a.miembros?.nombre?.[0]}{a.miembros?.apellido?.[0]}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.miembros?.apellido}, {a.miembros?.nombre}</div>
                                <div style={{ fontSize: 10, color: "var(--on-surface-variant)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.tipo} (hasta {formatDateLabel(a.fecha_fin)})</div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "var(--on-surface-variant)", fontSize: 11, margin: 0 }}>Nadie ausente hoy.</p>
                      )}
                    </div>

                    {/* Separador sutil */}
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }} />

                    {/* Sub-sección: Próximas */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#ffb95f", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Próximas</div>
                      {proximasAusenciasFiltradas?.length > 0 ? (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                          {proximasAusenciasFiltradas.map(a => (
                            <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.miembros?.apellido}, {a.miembros?.nombre}</div>
                                <div style={{ fontSize: 10, color: "var(--on-surface-variant)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {formatDateLabel(a.fecha_inicio)} - {formatDateLabel(a.fecha_fin)} ({a.tipo})
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p style={{ color: "var(--on-surface-variant)", fontSize: 11, margin: 0 }}>No hay ausencias programadas.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Oficiales de Registro en Oficina */}
                <div className="data-table-wrapper" style={{ padding: 12, background: "rgba(30,41,59,0.7)", borderRadius: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6, margin: 0, paddingBottom: 8, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#4edea3", fontSize: 18 }}>badge</span>
                    OR en Oficina
                  </h3>
                  <div style={{ marginTop: 8 }}>
                    {dailyData.ORsEnOficina?.length > 0 ? (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                        {dailyData.ORsEnOficina.map(or => (
                          <li key={or.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(78,222,163,0.2)", color: "#4edea3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>
                              {or.nombre?.[0]}{or.apellido?.[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{or.apellido}, {or.nombre}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--on-surface-variant)", fontSize: 12, margin: 0 }}>No hay ORs en oficina hoy.</p>
                    )}
                  </div>
                </div>

                {/* Resto del Equipo en Oficina (Menos OR) */}
                <div className="data-table-wrapper" style={{ padding: 12, background: "rgba(30,41,59,0.7)", borderRadius: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--on-surface)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6, margin: 0, paddingBottom: 8, borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <span className="material-symbols-outlined" style={{ color: "#adc6ff", fontSize: 18 }}>badge</span>
                    Resto del Equipo
                  </h3>
                  <div style={{ marginTop: 8 }}>
                    {dailyData.restoEnOficina?.length > 0 ? (
                      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                        {dailyData.restoEnOficina.map(m => (
                          <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(173,198,255,0.2)", color: "#adc6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600 }}>
                              {m.nombre?.[0]}{m.apellido?.[0]}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.apellido}, {m.nombre}</div>
                              <div style={{ fontSize: 10, color: "var(--on-surface-variant)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.equipo}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--on-surface-variant)", fontSize: 12, margin: 0 }}>No hay otros miembros hoy.</p>
                    )}
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* ========================================================
            VISTA SEMANAL: GRID DE TARJETAS DIARIAS
            ======================================================== */}
        {viewMode === "semanal" && (
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#adc6ff" }}>calendar_view_week</span>
              Resumen de Asistencia Semanal por Día
            </h3>

            {/* Fila de 5 Tarjetas para los 5 días */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              overflowX: "auto"
            }}>
              {weeklyDaysData.map((dayData) => {
                const dayDateStr = getYYYYMMDD(dayData.dayDate);
                const isToday = dayDateStr === getYYYYMMDD(new Date());

                return (
                  <div
                    key={dayData.dayName}
                    style={{
                      background: isToday ? "rgba(30,41,59,0.9)" : "rgba(30,41,59,0.6)",
                      border: isToday ? "1.5px solid #adc6ff" : "1px solid rgba(255,255,255,0.05)",
                      boxShadow: isToday ? "0 0 15px rgba(173,198,255,0.15)" : "none",
                      borderRadius: 12,
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      minHeight: 320,
                      backdropFilter: "blur(12px)"
                    }}
                  >
                    {/* Cabecera de la Tarjeta del Día */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      paddingBottom: 8
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {isToday && (
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4edea3", display: "inline-block", boxShadow: "0 0 8px #4edea3" }} />
                        )}
                        <span style={{ fontSize: 14, fontWeight: 700, color: isToday ? "#adc6ff" : "var(--on-surface)" }}>
                          {dayData.dayName}
                        </span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: isToday ? "#adc6ff" : "var(--on-surface-variant)" }}>
                        {dayData.dayNum}
                      </span>
                    </div>
                    {/* Ausentes */}
                    <div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#ffb4ab",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>event_busy</span>
                        Ausentes ({dayData.ausentes.length})
                      </div>
                      {dayData.ausentes.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {dayData.ausentes.map(a => (
                            <div
                              key={a.id}
                              style={{
                                fontSize: 11,
                                color: "#ffb4ab",
                                padding: "2px 6px",
                                background: "rgba(255,180,171,0.06)",
                                border: "1px solid rgba(255,180,171,0.12)",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={`${a.miembros?.apellido}, ${a.miembros?.nombre} (${a.tipo})`}
                            >
                              {a.miembros?.apellido}, {a.miembros?.nombre} <span style={{ opacity: 0.6, fontSize: 9 }}>({a.tipo})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", paddingLeft: 4 }}>— Nadie</div>
                      )}
                    </div>
                    {/* OR en Oficina */}
                    <div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#4edea3",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>badge</span>
                        OR en Oficina ({dayData.ORsEnOficina.length})
                      </div>
                      {dayData.ORsEnOficina.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {dayData.ORsEnOficina.map(or => (
                            <div
                              key={or.id}
                              style={{
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.85)",
                                padding: "2px 6px",
                                background: "rgba(78,222,163,0.06)",
                                border: "1px solid rgba(78,222,163,0.12)",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={`${or.apellido}, ${or.nombre} (Oficial de Registro)`}
                            >
                              {or.apellido}, {or.nombre}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", paddingLeft: 4 }}>— Nadie</div>
                      )}
                    </div>

                    {/* Resto en Oficina */}
                    <div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#adc6ff",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>badge</span>
                        Resto Oficina ({dayData.restoEnOficina.length})
                      </div>
                      {dayData.restoEnOficina.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {dayData.restoEnOficina.map(m => (
                            <div
                              key={m.id}
                              style={{
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.85)",
                                padding: "2px 6px",
                                background: "rgba(173,198,255,0.06)",
                                border: "1px solid rgba(173,198,255,0.12)",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={`${m.apellido}, ${m.nombre} (${m.equipo})`}
                            >
                              {m.apellido}, {m.nombre} <span style={{ opacity: 0.5, fontSize: 9 }}>({m.equipo})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", paddingLeft: 4 }}>— Nadie</div>
                      )}
                    </div>

                    {/* Home Office */}
                    <div>
                      <div style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: "#d2b4ff",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        marginBottom: 6,
                        display: "flex",
                        alignItems: "center",
                        gap: 4
                      }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>home</span>
                        Home Office ({dayData.homeOffice.length})
                      </div>
                      {dayData.homeOffice.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {dayData.homeOffice.map(ho => (
                            <div
                              key={ho.id}
                              style={{
                                fontSize: 11,
                                color: "rgba(255, 255, 255, 0.85)",
                                padding: "2px 6px",
                                background: "rgba(210,180,255,0.06)",
                                border: "1px solid rgba(210,180,255,0.12)",
                                borderRadius: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis"
                              }}
                              title={`${ho.miembros?.apellido}, ${ho.miembros?.nombre} (Home Office)`}
                            >
                              {ho.miembros?.apellido}, {ho.miembros?.nombre}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 10, color: "var(--on-surface-variant)", paddingLeft: 4 }}>— Nadie</div>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            FILA 2 (ABAJO): PROYECTOS & TAREAS (Se muestra SIEMPRE)
            ======================================================== */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div className="data-table-wrapper" style={{ padding: 20, background: "rgba(30,41,59,0.7)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#adc6ff" }}>task</span>
              Tareas / Proyectos Activos
            </h3>
            {tareasPendientes?.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                {tareasPendientes.map(t => {
                  const isLate = t.fecha_limite && t.fecha_limite < selectedDateString;
                  return (
                    <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: isLate ? "1px solid rgba(255,180,171,0.2)" : "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ fontSize: 15, fontWeight: 500, color: "var(--on-surface)" }}>{t.nombre}</div>
                          <span className={`badge ${t.estado === 'En curso' ? 'badge-blue' : t.estado === 'Pendiente' ? 'badge-gray' : 'badge-amber'}`} style={{ fontSize: 10 }}>{t.estado}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--on-surface-variant)", marginTop: 4 }}>
                          {t.miembros ? `${t.miembros.apellido}, ${t.miembros.nombre}` : "Sin asignar"}
                        </div>
                        {t.fecha_limite && (
                          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: isLate ? "#ffb4ab" : "var(--outline)", marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
                            {isLate ? "Vencido el " : "Vence el "}{formatDateLabel(t.fecha_limite)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Todo al día. No hay tareas pendientes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Estilos locales de interacción premium */}
      <style jsx global>{`
        .table-row-hover:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        .matrix-cell-badge:hover {
          filter: brightness(1.2);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.05);
        }
        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.08) !important;
          color: #adc6ff !important;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1) sepia(1) saturate(5) hue-rotate(185deg);
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
