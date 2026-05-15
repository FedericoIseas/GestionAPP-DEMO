import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProyectosClient from "./ProyectosClient";

export const metadata = { title: "Tareas" };

export default async function ProyectosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: proyectos } = await supabase
    .from("proyectos")
    .select("*, miembros(id, nombre, apellido, equipo), notas_proyecto(contenido, created_at)")
    .eq("activo", true)
    .order("created_at", { ascending: false })
    .order("created_at", { referencedTable: "notas_proyecto", ascending: false });

  const { data: miembros } = await supabase
    .from("miembros")
    .select("id, nombre, apellido, equipo")
    .eq("activo", true)
    .order("apellido");

  return <ProyectosClient proyectos={proyectos || []} miembros={miembros || []} />;
}
