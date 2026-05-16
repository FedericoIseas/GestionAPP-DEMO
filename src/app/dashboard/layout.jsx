import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import AIChat from "@/components/layout/AIChat";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <div className="app-layout">
      <Sidebar user={user} />
      <main className="main-content" style={{ marginLeft: 280 }}>
        {children}
      </main>
      <AIChat />
    </div>
  );
}
