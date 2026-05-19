import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Fechas y días (Forzar zona horaria de Argentina)
  const formatter = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const getPart = (type) => parts.find(p => p.type === type).value;

  const todayString = `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
  const hora = parseInt(getPart("hour"), 10);

  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";

  const fechaLargaRaw = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(new Date());

  let fechaFormateada = fechaLargaRaw.charAt(0).toUpperCase() + fechaLargaRaw.slice(1);
  fechaFormateada = fechaFormateada.replace(",", " -") + " hs";

  // Fetch all active records so the client can filter and show any day/week dynamically
  const [
    { data: todosLosMiembros },
    { data: todasLasAusencias },
    { data: todosLosHorarios },
    { data: tareasPendientes }
  ] = await Promise.all([
    supabase.from("miembros").select("id, nombre, apellido, equipo").eq("activo", true),
    supabase.from("ausencias").select("*, miembros(nombre, apellido)").eq("activo", true),
    supabase.from("horarios").select("*, miembros(nombre, apellido)").eq("activo", true).eq("es_home_office", true),
    supabase.from("proyectos").select("*, miembros(id, nombre, apellido, equipo)").eq("activo", true).neq("estado", "Completado").order("fecha_limite", { ascending: true })
  ]);

  return (
    <DashboardClient
      todosLosMiembros={todosLosMiembros || []}
      todasLasAusencias={todasLasAusencias || []}
      todosLosHorarios={todosLosHorarios || []}
      tareasPendientes={tareasPendientes || []}
      initialDateString={todayString}
      saludo={saludo}
      fechaFormateada={fechaFormateada}
    />
  );
}
