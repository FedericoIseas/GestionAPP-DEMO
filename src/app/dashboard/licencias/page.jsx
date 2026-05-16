import { readSheetsData } from "@/lib/sheets-reader";
import LicenciasClient from "./LicenciasClient";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LicenciasPage() {
  // Leemos los datos directamente del Excel
  const sheetsData = readSheetsData();
  
  // Obtenemos los miembros activos de la base de datos
  const supabase = await createClient();
  const { data: miembros } = await supabase.from("miembros").select("*").eq("activo", true);

  if (!sheetsData) {
    return (
      <div className="empty-state" style={{ marginTop: 40 }}>
        <span className="material-symbols-outlined empty-state-icon" style={{ color: "var(--error)" }}>error</span>
        <div className="empty-state-title">Error al leer el archivo Excel</div>
        <div className="empty-state-desc">Verificá que el archivo 'Licencias Firma Digital.xlsx' esté en la carpeta 'data'.</div>
      </div>
    );
  }

  return <LicenciasClient initialData={sheetsData} miembros={miembros || []} />;
}
