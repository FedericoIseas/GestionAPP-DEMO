import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AusenciasClient from "./AusenciasClient";

export const metadata = { title: "Ausencias" };

export default async function AusenciasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [
    { data: ausencias },
    { data: miembros }
  ] = await Promise.all([
    supabase.from("ausencias").select("*, miembros(nombre, apellido)").eq("activo", true).order("fecha_inicio", { ascending: false }),
    supabase.from("miembros").select("id, nombre, apellido").eq("activo", true).order("apellido")
  ]);

  return <AusenciasClient ausencias={ausencias || []} miembros={miembros || []} />;
}
