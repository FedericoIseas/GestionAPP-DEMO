import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PersonalClient from "./PersonalClient";

export const metadata = { title: "Personal" };

export default async function PersonalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: miembros, error } = await supabase
    .from("miembros")
    .select("*")
    .eq("activo", true)
    .order("apellido", { ascending: true });

  return <PersonalClient miembros={miembros || []} />;
}
