import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import EquipamientoClient from "./EquipamientoClient";

export const metadata = { title: "Equipamiento" };

export default async function EquipamientoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: equipos } = await supabase
    .from("equipamiento")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  const { data: miembros } = await supabase
    .from("miembros")
    .select("id, nombre, apellido")
    .eq("activo", true)
    .order("apellido");

  return <EquipamientoClient equipos={equipos || []} miembros={miembros || []} />;
}
