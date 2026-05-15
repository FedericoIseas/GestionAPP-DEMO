import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import HorariosClient from "./HorariosClient";

export const metadata = { title: "Horarios" };

export default async function HorariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: horarios } = await supabase
    .from("horarios")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .order("dia_semana", { ascending: true });

  const { data: miembros } = await supabase
    .from("miembros")
    .select("id, nombre, apellido")
    .eq("activo", true)
    .order("apellido");

  return <HorariosClient horarios={horarios || []} miembros={miembros || []} />;
}
