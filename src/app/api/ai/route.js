import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req) {
  try {
    const { prompt } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Falta configurar GEMINI_API_KEY en .env.local" }, { status: 500 });
    }

    const supabase = await createClient();

    // 1. Recopilar datos de la base de datos para darle contexto a la IA
    const { data: miembros } = await supabase.from("miembros").select("id, nombre, apellido, equipo, puesto").eq("activo", true);
    const { data: proyectos } = await supabase.from("proyectos").select("nombre, estado, fecha_limite, miembros(nombre, apellido)").eq("activo", true);
    const { data: ausencias } = await supabase.from("ausencias").select("tipo, fecha_inicio, fecha_fin, miembros(nombre, apellido)").eq("activo", true);
    const { data: horarios } = await supabase.from("horarios").select("dia_semana, es_home_office, miembros(nombre, apellido)").eq("activo", true);
    const { data: equipamiento } = await supabase.from("equipamiento").select("nombre, tipo, estado, asignado_a, miembros(nombre, apellido)").eq("activo", true);

    const dbContext = JSON.stringify({
      personal: miembros,
      tareas_y_proyectos: proyectos,
      ausencias_programadas: ausencias,
      horarios_semanales: horarios,
      equipamiento_inventario: equipamiento,
    });

    // 2. Preparar el prompt estructurado para Gemini
    const systemPrompt = `Eres el asistente inteligente de la aplicación 'Team Manager'.
Tu trabajo es responder las preguntas del gerente de forma concisa, útil y directa.
Habla en español de Argentina (vos), de forma profesional pero amigable.
Utiliza únicamente los siguientes datos en formato JSON de la base de datos de la empresa para responder.
Si no sabes la respuesta o no está en los datos, dilo amablemente. No inventes información.

DATOS ACTUALES DE LA BASE DE DATOS:
${dbContext}

PREGUNTA DEL USUARIO:
${prompt}`;

    // 3. Llamar a la API REST nativa de Gemini Pro
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Error en Gemini API");
    }

    const answer = data.candidates[0].content.parts[0].text;

    return NextResponse.json({ answer });

  } catch (error) {
    console.error("AI Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
