import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fechas y días
  const today = new Date();
  // Adjust for timezone offset for accurate YYYY-MM-DD local
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset*60*1000));
  const todayString = localToday.toISOString().split('T')[0];
  const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday

  const hora = today.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  // Fetch data
  const { data: todosLosMiembros, count: totalMiembros } = await supabase
    .from("miembros")
    .select("id, nombre, apellido, equipo", { count: "exact" })
    .eq("activo", true);

  const { data: ausentesHoy } = await supabase
    .from("ausencias")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .lte("fecha_inicio", todayString)
    .gte("fecha_fin", todayString);

  const { data: proximasAusencias } = await supabase
    .from("ausencias")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .gt("fecha_inicio", todayString)
    .order("fecha_inicio", { ascending: true })
    .limit(5);

  const { data: homeOfficeHoy } = await supabase
    .from("horarios")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .eq("dia_semana", dayOfWeek)
    .eq("es_home_office", true);


  const ausentesIds = ausentesHoy?.map(a => a.miembro_id) || [];
  const hoIds = homeOfficeHoy?.map(h => h.miembro_id) || [];
  const ORsEnOficina = todosLosMiembros?.filter(m => 
    m.equipo === "Oficiales de Registro" && !ausentesIds.includes(m.id) && !hoIds.includes(m.id)
  ) || [];

  const { data: tareasPendientes } = await supabase
    .from("proyectos")
    .select("*, miembros(id, nombre, apellido, equipo)")
    .eq("activo", true)
    .neq("estado", "Completado")
    .order("fecha_limite", { ascending: true, nullsFirst: false })
    .limit(6);

  const stats = [
    { label: "Miembros activos", value: totalMiembros || 0, sub: "Total del equipo", pct: 100, icon: "group", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
    { label: "En oficina hoy", value: (totalMiembros || 0) - (homeOfficeHoy?.length || 0) - (ausentesHoy?.length || 0), sub: "Presenciales", pct: totalMiembros ? (((totalMiembros - (homeOfficeHoy?.length || 0) - (ausentesHoy?.length || 0)) / totalMiembros) * 100) : 0, icon: "domain", color: "#4edea3", shadow: "rgba(78,222,163,0.5)" },
    { label: "Home office hoy", value: homeOfficeHoy?.length || 0, sub: "Remotos", pct: totalMiembros ? (((homeOfficeHoy?.length || 0) / totalMiembros) * 100) : 0, icon: "home", color: "#adc6ff", shadow: "rgba(173,198,255,0.5)" },
    { label: "Ausentes hoy", value: ausentesHoy?.length || 0, sub: "Licencias/Vacaciones", pct: totalMiembros ? (((ausentesHoy?.length || 0) / totalMiembros) * 100) : 0, icon: "event_busy", color: "#ffb4ab", shadow: "rgba(255,180,171,0.5)" },
  ];

  function formatDate(d) {
    if (!d) return "—";
    return new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  }

  return (
    <>
      <header className="page-header" style={{ paddingBottom: 24 }}>
        <div>
          <p className="page-header-sub" style={{ marginBottom: 4 }}>{saludo} 👋</p>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "var(--on-surface)" }}>Resumen</h1>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
           <div className="search-bar">
            <span className="material-symbols-outlined" style={{ fontSize: 20, marginRight: 8 }}>search</span>
            <span>Buscar...</span>
          </div>
        </div>
      </header>

      <section className="content-stage">
        {/* Stats */}
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-header">
                <span className="stat-label">{stat.label}</span>
                <span className="material-symbols-outlined" style={{ color: stat.color, fontSize: 24 }}>{stat.icon}</span>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span className="stat-value">{stat.value}</span>
                  {stat.sub && <span className="stat-sub">{stat.sub}</span>}
                </div>
                <div className="progress-track">
                  <div className="progress-bar" style={{
                    width: `${Math.min(stat.pct, 100)}%`,
                    background: stat.color,
                    boxShadow: `0 0 12px ${stat.shadow}`,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {/* Tareas Pendientes */}
          <div className="data-table-wrapper" style={{ padding: 16, background: "rgba(30,41,59,0.7)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#adc6ff" }}>task</span>
              Tareas / Proyectos Activos
            </h3>
            {tareasPendientes?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tareasPendientes.map(t => {
                  const isLate = t.fecha_limite && t.fecha_limite < todayString;
                  return (
                  <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: isLate ? "1px solid rgba(255,180,171,0.2)" : "1px solid rgba(255,255,255,0.05)" }}>
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
                          {isLate ? "Vencido el " : "Vence el "}{formatDate(t.fecha_limite)}
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

          {/* Ausentes Hoy */}
          <div className="data-table-wrapper" style={{ padding: 16, background: "rgba(30,41,59,0.7)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#ffb4ab" }}>event_busy</span>
              Ausentes Hoy
            </h3>
            {ausentesHoy?.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {ausentesHoy.map(a => (
                  <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,180,171,0.2)", color: "#ffb4ab", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                      {a.miembros?.nombre?.[0]}{a.miembros?.apellido?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{a.miembros?.apellido}, {a.miembros?.nombre}</div>
                      <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>{a.tipo} (hasta {formatDate(a.fecha_fin)})</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>Nadie ausente hoy.</p>
            )}
          </div>

          {/* Próximas Ausencias */}
          <div className="data-table-wrapper" style={{ padding: 16, background: "rgba(30,41,59,0.7)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#ffb95f" }}>calendar_month</span>
              Próximas Ausencias
            </h3>
            {proximasAusencias?.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {proximasAusencias.map(a => (
                  <li key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{a.miembros?.apellido}, {a.miembros?.nombre}</div>
                      <div style={{ fontSize: 12, color: "var(--on-surface-variant)" }}>
                        {formatDate(a.fecha_inicio)} - {formatDate(a.fecha_fin)} ({a.tipo})
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No hay ausencias programadas próximamente.</p>
            )}
          </div>

          {/* Oficiales de Registro en Oficina */}
          <div className="data-table-wrapper" style={{ padding: 16, background: "rgba(30,41,59,0.7)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--on-surface)", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "#4edea3" }}>badge</span>
              OR en Oficina
            </h3>
            {ORsEnOficina?.length > 0 ? (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {ORsEnOficina.map(or => (
                  <li key={or.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(78,222,163,0.2)", color: "#4edea3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600 }}>
                      {or.nombre?.[0]}{or.apellido?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14 }}>{or.apellido}, {or.nombre}</div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "var(--on-surface-variant)", fontSize: 14 }}>No hay Oficiales de Registro en la oficina hoy.</p>
            )}
          </div>

        </div>
      </section>
    </>
  );
}
