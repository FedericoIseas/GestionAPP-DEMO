import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { readSheetsData } from "@/lib/sheets-reader";

export async function POST(req) {
  try {
    const supabase = await createClient();

    // 1. Leer archivo Excel
    const sheetsData = readSheetsData();
    if (!sheetsData) {
      return NextResponse.json({ error: "No se pudo leer el archivo Excel" }, { status: 500 });
    }

    // 2. Obtener miembros activos para mapear nombres a IDs
    const { data: miembros } = await supabase.from("miembros").select("*").eq("activo", true);
    if (!miembros) {
      return NextResponse.json({ error: "No se pudieron obtener los miembros" }, { status: 500 });
    }

    // Normalizador de nombres
    const normalize = (str) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

    // 3. Filtrar y preparar los registros a importar
    const registrosNuevos = [];
    const solicitudes = sheetsData.solicitudes || [];

    for (const s of solicitudes) {
      // Ignorar si no tiene fechas o es comisión
      if (!s.desde || !s.desde.includes("-") || (s.tipo && s.tipo.toLowerCase().includes("comisión"))) {
        continue;
      }

      // Buscar el miembro correspondiente en la DB
      const ag = normalize(s.agente);
      const miembroEncontrado = miembros.find(m => ag.includes(normalize(m.apellido)) || ag.includes(normalize(m.nombre)));

      if (!miembroEncontrado) continue; // Si no es un miembro activo, lo salteamos

      // 4. Mapear al esquema de la tabla "ausencias"
      // tipo: "Vacaciones", "Licencia", "Ausencia", "Feriado", "Otro"
      let tipoFinal = "Otro";
      const tipoStr = (s.tipo || "").toLowerCase();
      if (tipoStr.includes("lao") || tipoStr.includes("1109") || tipoStr.includes("vacaciones")) tipoFinal = "Vacaciones";
      else if (tipoStr.includes("13a") || tipoStr.includes("examen")) tipoFinal = "Licencia";
      else if (tipoStr.includes("14f") || tipoStr.includes("familiar")) tipoFinal = "Ausencia";
      else tipoFinal = "Licencia"; // Por defecto a Licencia si viene del form de licencias

      const fechaHasta = s.hasta && s.hasta.includes("-") ? s.hasta : s.desde;

      registrosNuevos.push({
        miembro_id: miembroEncontrado.id,
        tipo: tipoFinal,
        fecha_inicio: s.desde,
        fecha_fin: fechaHasta,
        notas: `[Excel: ${s.tipo || ""}] ${s.observaciones || s.ccoo || ""}`.trim(),
        activo: true
      });
    }

    if (registrosNuevos.length === 0) {
      return NextResponse.json({ message: "No hay registros válidos para importar." });
    }

    // 5. Obtener ausencias existentes para deduplicar
    const { data: ausenciasExistentes } = await supabase.from("ausencias").select("miembro_id, fecha_inicio, fecha_fin");
    
    // Crear un Set con las claves existentes
    const setExistentes = new Set();
    if (ausenciasExistentes) {
      for (const a of ausenciasExistentes) {
        setExistentes.add(`${a.miembro_id}_${a.fecha_inicio}_${a.fecha_fin}`);
      }
    }

    // Filtrar los que ya existen
    const registrosUnicos = registrosNuevos.filter(r => {
      const key = `${r.miembro_id}_${r.fecha_inicio}_${r.fecha_fin}`;
      if (setExistentes.has(key)) return false;
      
      // Además lo agregamos al Set para no insertar duplicados que vengan en el mismo Excel
      setExistentes.add(key);
      return true;
    });

    if (registrosUnicos.length === 0) {
      return NextResponse.json({ message: "Todos los registros ya estaban sincronizados. 0 importados." });
    }
    
    // 6. Insertamos en batch
    const { error } = await supabase.from("ausencias").insert(registrosUnicos);

    if (error) {
      console.error("Error insertando en supabase:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `Se importaron ${registrosUnicos.length} registros nuevos.` });

  } catch (err) {
    console.error("Error en la importación:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
