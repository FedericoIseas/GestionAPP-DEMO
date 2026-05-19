import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { readSheetsData } from "@/lib/sheets-reader";

const GEMINI_KEY = process.env.GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { message, audioData, mimeType } = await req.json();

    if (!GEMINI_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY no está configurada en .env.local" }, { status: 500 });
    }

    const supabase = await createClient();

    // 1. Obtener contexto de la base de datos
    const [
      { data: miembros },
      { data: ausencias },
      { data: horarios },
      { data: equipamiento },
      { data: tareas },
    ] = await Promise.all([
      supabase.from("miembros").select("*").eq("activo", true),
      supabase.from("ausencias").select("*, miembros(nombre, apellido)").eq("activo", true),
      supabase.from("horarios").select("*").eq("activo", true),
      supabase.from("equipamiento").select("*, miembros(nombre, apellido)").eq("activo", true),
      supabase.from("proyectos").select("*, miembros(nombre, apellido)").eq("activo", true),
    ]);

    const today = new Date().toLocaleDateString("es-AR", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Leer datos del Excel de licencias
    const sheetsData = readSheetsData();

    const systemPrompt = `
Eres "Team Manager AI", un asistente inteligente experto en GestionApp FDs de la Dirección Nacional de Firma Digital.
Responde consultas del administrador basándote ÚNICAMENTE en los datos proporcionados.
Hoy es ${today}.

=== DATOS DE SUPABASE ===
- Personal (miembros activos): ${JSON.stringify(miembros)}
- Ausencias cargadas: ${JSON.stringify(ausencias)}
- Horarios Home Office (dia_semana: 1=Lun,2=Mar,3=Mie,4=Jue,5=Vie): ${JSON.stringify(horarios)}
- Equipamiento: ${JSON.stringify(equipamiento)}
- Tareas/Proyectos: ${JSON.stringify(tareas)}

=== DATOS DEL EXCEL DE LICENCIAS ===
- Solicitudes de licencias (FSOLI): ${JSON.stringify(sheetsData?.solicitudes || [])}
- Nómina completa: ${JSON.stringify(sheetsData?.nomina || [])}
- Vacaciones período 2024 (vigente dic2024-nov2025): ${JSON.stringify(sheetsData?.vacaciones_2024 || [])}
- Vacaciones/Solicitudes 2025: ${JSON.stringify(sheetsData?.vacaciones_2025 || [])}
- Normativa de licencias (tipos, artículos, duración): ${JSON.stringify(sheetsData?.normativa || [])}

REGLAS:
1. Sé conciso y profesional. Usa bullet points.
2. No inventes datos. Si no encontrás algo, decilo.
3. Responde siempre en español.
4. Los tipos de licencia comunes son: LAO o 1109 (Lic. Anual Ordinaria/Vacaciones), 13A (Examen), 14F (Familiar enfermo), 9A (otros).
5. Para consultas de vacaciones, revisá tanto el Excel (vacaciones_2024, solicitudes FSOLI) como las ausencias de Supabase.
6. La nómina del Excel tiene datos adicionales como tipo de contrato, CUIL, cargo y horario.

=== EJECUCIÓN DE ACCIONES ===
Si el usuario te pide registrar, agregar o anotar una nueva licencia, ausencia o vacación, DEBES incluir al final de tu respuesta de texto un bloque de código JSON exacto con este formato (usando los IDs del arreglo Personal):
\`\`\`json
{
  "action": "create_ausencia",
  "miembro_id": "ID_DEL_EMPLEADO",
  "tipo": "Vacaciones|Licencia|Ausencia|Feriado|Otro",
  "fecha_inicio": "YYYY-MM-DD",
  "fecha_fin": "YYYY-MM-DD",
  "notas": "Día de estudio, familiar enfermo, etc."
}
\`\`\`
Deduce las fechas según el día de hoy (${today}). Si falta información, pregúntasela al usuario antes de emitir el JSON.`.trim();

    // 2. Primero listamos modelos disponibles para debug
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_KEY}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();

    if (!listRes.ok) {
      console.error("Error listando modelos:", JSON.stringify(listData));
      return NextResponse.json({
        error: "Error con la API Key de Gemini",
        detail: JSON.stringify(listData),
      }, { status: 500 });
    }

    // Buscar un modelo disponible para generateContent
    const availableModels = listData.models
      ?.filter(m => m.supportedGenerationMethods?.includes("generateContent"))
      ?.map(m => m.name) || [];

    console.log("Modelos disponibles para generateContent:", availableModels);

    // Elegir modelo (evitar gemini-2.0-flash que tiene cuota agotada)
    const preferred = [
      "models/gemini-2.5-flash",
      "models/gemini-2.5-pro",
      "models/gemini-3.1-pro-preview",
      "models/gemini-3-flash-preview",
      "models/gemini-2.0-flash-lite",
      "models/gemini-1.5-flash",
      "models/gemini-pro",
    ];
    // Construir lista de candidatos en orden de preferencia (solo los que existen)
    const candidates = preferred.filter(m => availableModels.includes(m));
    if (candidates.length === 0 && availableModels.length > 0) {
      candidates.push(availableModels[0]);
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        error: "No se encontró ningún modelo compatible",
        detail: `Modelos listados: ${availableModels.join(", ") || "ninguno"}`,
      }, { status: 500 });
    }

    console.log("Candidatos en orden:", candidates);

    // 3. Intentar modelos en orden (auto-fallback si hay cuota agotada)
    let chosenModel = null;
    let responseText = null;

    // Armar los componentes del prompt
    const parts = [{ text: systemPrompt }];

    if (audioData) {
      parts.push({
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioData
        }
      });
      parts.push({ text: "Escucha el audio adjunto e identifica la acción requerida. Si no te enviaron texto, solo usa el audio." });
    }

    if (message) {
      parts.push({ text: `Consulta del usuario: ${message}` });
    }

    for (const model of candidates) {
      const genUrl = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${GEMINI_KEY}`;

      const genRes = await fetch(genUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      });

      const genData = await genRes.json();

      if (genRes.ok) {
        chosenModel = model;
        responseText =
          genData?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "No se pudo obtener una respuesta del modelo.";
        break;
      }

      // Si es error de cuota (429), probar el siguiente modelo
      if (genRes.status === 429) {
        console.log(`Cuota agotada para ${model}, probando siguiente...`);
        continue;
      }

      // Otro error: reportar
      console.error(`Error en ${model}:`, JSON.stringify(genData));
      return NextResponse.json({
        error: "Error al generar respuesta",
        detail: JSON.stringify(genData),
      }, { status: 500 });
    }

    if (!responseText) {
      return NextResponse.json({
        error: "Todos los modelos tienen la cuota agotada. Intentá de nuevo en unos minutos.",
      }, { status: 429 });
    }

    const modelShort = chosenModel.replace("models/", "");
    console.log(`Respuesta generada con: ${modelShort}`);

    // Procesar posibles acciones (JSON block)
    let finalResponseText = responseText;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[1]);
        if (actionData.action === "create_ausencia" && actionData.miembro_id) {
          const { error } = await supabase.from("ausencias").insert([{
            miembro_id: actionData.miembro_id,
            tipo: actionData.tipo || "Otro",
            fecha_inicio: actionData.fecha_inicio,
            fecha_fin: actionData.fecha_fin || actionData.fecha_inicio,
            notas: actionData.notas || "Cargado por IA",
            activo: true
          }]);

          if (!error) {
            finalResponseText = responseText.replace(/```json\n[\s\S]*?\n```/, "").trim();
            finalResponseText += "\n\n✅ **¡Acción ejecutada!** La ausencia fue registrada exitosamente en la base de datos.";
          } else {
            console.error("Error insertando desde IA:", error);
            finalResponseText += "\n\n❌ **Error al registrar:** Hubo un problema al guardar en la base de datos.";
          }
        }
      } catch (e) {
        console.error("Error parseando acción JSON de IA:", e);
      }
    }

    return NextResponse.json({ text: finalResponseText, model: modelShort });
  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json(
      { error: "Error inesperado", detail: error.message },
      { status: 500 }
    );
  }
}
