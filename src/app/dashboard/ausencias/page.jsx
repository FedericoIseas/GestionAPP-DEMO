import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AusenciasClient from "./AusenciasClient";

export const metadata = { title: "Ausencias" };

export default async function AusenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: ausencias } = await supabase
    .from("ausencias")
    .select("*, miembros(nombre, apellido)")
    .eq("activo", true)
    .order("fecha_inicio", { ascending: false });

  const { data: miembros } = await supabase
    .from("miembros")
    .select("id, nombre, apellido")
    .eq("activo", true)
    .order("apellido");

  return <AusenciasClient ausencias={ausencias || []} miembros={miembros || []} />;
}
