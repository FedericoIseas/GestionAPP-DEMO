"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard", exact: true },
  { label: "Personal", href: "/dashboard/personal", icon: "group" },
  { label: "Equipamiento", href: "/dashboard/equipamiento", icon: "inventory_2" },
  { label: "Ausencias", href: "/dashboard/ausencias", icon: "event_busy" },
  { label: "Horarios", href: "/dashboard/horarios", icon: "schedule" },
  { label: "Tareas", href: "/dashboard/proyectos", icon: "task" },
  { label: "Asistente IA", href: "/dashboard/ia", icon: "smart_toy", badge: "PRO" },
  { label: "Reportes", href: "/dashboard/reportes", icon: "assessment" },
  { label: "Configuración", href: "/dashboard/configuracion", icon: "settings" },
];

export default function Sidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleAIChatOpen = () => {
      setMobileOpen(false);
    };
    window.addEventListener("ai-chat-open", handleAIChatOpen);
    return () => {
      window.removeEventListener("ai-chat-open", handleAIChatOpen);
    };
  }, []);

  const handleToggleMobileOpen = (value) => {
    setMobileOpen(value);
    if (value) {
      window.dispatchEvent(new CustomEvent("mobile-menu-open"));
    }
  };

  function isActive(href, exact) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <>
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={() => handleToggleMobileOpen(!mobileOpen)}>
        <span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span>
      </button>

      {/* Mobile overlay */}
      <div className={`mobile-overlay ${mobileOpen ? "open" : ""}`} onClick={() => handleToggleMobileOpen(false)} />

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="material-symbols-outlined" style={{ color: "#00285d", fontSize: 24 }}>group_work</span>
          </div>
          <div>
            <div className="sidebar-title">Gestión de equipo</div>
            <div className="sidebar-subtitle">Panel de administración</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${active ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">AD</div>
            <div className="user-info">
              <div className="user-name">Admin</div>
              <div className="user-email">{user?.email}</div>
            </div>
            <button className="logout-btn" onClick={handleLogout} disabled={loggingOut} title="Cerrar sesión">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
