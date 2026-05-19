import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import AIChat from "@/components/layout/AIChat";
import SessionTimeout from "@/components/layout/SessionTimeout";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="app-layout">
      <SessionTimeout />
      <Sidebar user={user} />
      <main className="main-content">
        {children}
      </main>
      <AIChat />
    </div>
  );
}
