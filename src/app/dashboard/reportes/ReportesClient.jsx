"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

export default function ReportesClient() {
  const [loadingExport, setLoadingExport] = useState(false);

  async function exportarAusencias() {
    setLoadingExport(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("ausencias")
        .select("*, miembros(nombre, apellido, equipo)")
        .order("fecha_inicio", { ascending: false });
        
      if (error) throw error;

      // Formatear data para Excel
      const excelData = data.map(a => ({
        "Apellido": a.miembros?.apellido || "Desconocido",
        "Nombre": a.miembros?.nombre || "",
        "Equipo": a.miembros?.equipo || "",
        "Tipo": a.tipo,
        "Desde": a.fecha_inicio,
        "Hasta": a.fecha_fin,
        "Notas": a.notas || "",
        "Activo": a.activo ? "Sí" : "No"
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ausencias");
      
      XLSX.writeFile(workbook, `Reporte_Ausencias_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert("Error al exportar: " + err.message);
    } finally {
      setLoadingExport(false);
    }
  }

  async function exportarPersonal() {
    setLoadingExport(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("miembros")
        .select("*")
        .order("apellido", { ascending: true });
        
      if (error) throw error;

      const excelData = data.map(m => ({
        "Apellido": m.apellido,
        "Nombre": m.nombre,
        "Equipo": m.equipo,
        "Rol": m.rol,
        "Email": m.email || "",
        "Teléfono": m.telefono || "",
        "Activo": m.activo ? "Sí" : "No"
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Personal");
      
      XLSX.writeFile(workbook, `Reporte_Personal_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert("Error al exportar: " + err.message);
    } finally {
      setLoadingExport(false);
    }
  }

  return (
    <div className="content-stage">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        
        {/* Card Exportar Ausencias */}
        <div className="stat-card" style={{ padding: 24, height: "auto", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div className="stat-header" style={{ marginBottom: 16, width: "100%" }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>Reporte de Ausencias</span>
            <span className="material-symbols-outlined" style={{ color: "var(--primary)", fontSize: 28 }}>event_busy</span>
          </div>
          <p style={{ color: "var(--on-surface-variant)", marginBottom: 24, fontSize: 14 }}>
            Descargá un archivo Excel con el historial completo de todas las licencias, vacaciones y ausencias registradas en la base de datos.
          </p>
          <button onClick={exportarAusencias} disabled={loadingExport} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            <span className="material-symbols-outlined">download</span>
            Descargar Excel
          </button>
        </div>

        {/* Card Exportar Personal */}
        <div className="stat-card" style={{ padding: 24, height: "auto", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div className="stat-header" style={{ marginBottom: 16, width: "100%" }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>Nómina de Personal</span>
            <span className="material-symbols-outlined" style={{ color: "#4edea3", fontSize: 28 }}>group</span>
          </div>
          <p style={{ color: "var(--on-surface-variant)", marginBottom: 24, fontSize: 14 }}>
            Descargá la lista completa de tu equipo, incluyendo roles, información de contacto y a qué área pertenecen.
          </p>
          <button onClick={exportarPersonal} disabled={loadingExport} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
            <span className="material-symbols-outlined">download</span>
            Descargar Excel
          </button>
        </div>

      </div>
    </div>
  );
}
