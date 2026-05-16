import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from("ausencias").select("id, miembro_id, fecha_inicio, fecha_fin");
  if (error) {
    console.error(error);
    return;
  }

  const seen = new Set();
  const duplicates = [];

  for (const row of data) {
    const key = `${row.miembro_id}_${row.fecha_inicio}_${row.fecha_fin}`;
    if (seen.has(key)) {
      duplicates.push(row.id);
    } else {
      seen.add(key);
    }
  }

  console.log(`Borrando ${duplicates.length} duplicados...`);
  if (duplicates.length > 0) {
    // Delete in batches of 100
    for (let i = 0; i < duplicates.length; i += 100) {
      const batch = duplicates.slice(i, i + 100);
      await supabase.from("ausencias").delete().in("id", batch);
    }
    console.log("¡Duplicados eliminados!");
  } else {
    console.log("No se encontraron duplicados.");
  }
}

run();
