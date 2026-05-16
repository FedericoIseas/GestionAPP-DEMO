import Link from "next/link";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#0f172a", color: "#f8fafc" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 80, color: "#ffb4ab", marginBottom: 16 }}>broken_image</span>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>404 - Página no encontrada</h1>
      <p style={{ color: "#94a3b8", marginBottom: 32 }}>La página que intentás buscar no existe o fue movida.</p>
      <Link href="/dashboard" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 24px", height: 48, borderRadius: 24, textDecoration: "none" }}>
        <span className="material-symbols-outlined">arrow_back</span>
        Volver al Dashboard
      </Link>
    </div>
  );
}
