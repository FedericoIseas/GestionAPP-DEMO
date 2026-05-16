import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.from("ausencias").select("id, miembro_id, fecha_inicio, fecha_fin");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const seen = new Set();
    const duplicates = [];
    const toFix = [];

    for (const row of data) {
      const key = `${row.miembro_id}_${row.fecha_inicio}_${row.fecha_fin}`;
      if (seen.has(key)) {
        duplicates.push(row.id);
      } else {
        seen.add(key);
      }
    }
    
    // Buscar las que dicen 1109 pero no son Vacaciones
    const { data: fixData } = await supabase
      .from("ausencias")
      .select("id, tipo, notas")
      .ilike("notas", "%1109%")
      .neq("tipo", "Vacaciones");

    if (fixData && fixData.length > 0) {
      const idsToFix = fixData.map(r => r.id);
      await supabase.from("ausencias").update({ tipo: "Vacaciones" }).in("id", idsToFix);
    }

    if (duplicates.length > 0) {
      for (let i = 0; i < duplicates.length; i += 100) {
        const batch = duplicates.slice(i, i + 100);
        await supabase.from("ausencias").delete().in("id", batch);
      }
      return NextResponse.json({ message: `Se encontraron y borraron ${duplicates.length} ausencias duplicadas.` });
    } else {
      return NextResponse.json({ message: "No se encontraron duplicados en la base de datos." });
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
