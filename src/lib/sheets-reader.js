import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "data", "Licencias Firma Digital.xlsx");

let cachedData = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function readSheetsData() {
  const now = Date.now();
  if (cachedData && (now - cacheTime) < CACHE_TTL) {
    return cachedData;
  }

  try {
    // Leemos con fs y pasamos el buffer a XLSX para evitar restricciones de Next.js
    const buffer = fs.readFileSync(FILE_PATH);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const result = {};

    // 1. FSOLI — Solicitudes de licencias (la más importante)
    if (workbook.SheetNames.includes("FSOLI")) {
      const raw = XLSX.utils.sheet_to_json(workbook.Sheets["FSOLI"], { header: 1 });
      const headers = raw[0]; // ["DESDE","HASTA","TIPO","AGENTE","TOTAL",2020,...,"CCOO","OBSERVACIONES"]
      result.solicitudes = raw.slice(1).filter(r => r[3]).map(row => ({
        desde: formatExcelDate(row[0]),
        hasta: formatExcelDate(row[1]),
        tipo: row[2] || "",
        agente: row[3] || "",
        total_dias: row[4] || 0,
        anio_2024: row[9] || "-",
        anio_2025: row[10] || "-",
        anio_2026: row[11] || "-",
        ccoo: row[12] || "",
        observaciones: row[13] || "",
      }));
    }

    // 2. Nómina — Datos del personal
    if (workbook.SheetNames.includes("Nómina")) {
      const raw = XLSX.utils.sheet_to_json(workbook.Sheets["Nómina"], { header: 1 });
      // Headers en fila 1 (índice 1)
      result.nomina = raw.slice(2).filter(r => r[1]).map(row => ({
        nro: row[0],
        apellido: row[1] || "",
        nombre: row[2] || "",
        dni: row[3] || "",
        cuil: row[4] || "",
        contrato: row[5] || "",
        funcion_ejecutiva: row[6] || "",
        letra_grado: row[7] || "",
        fecha_ingreso: row[8] || "",
        cargo: row[9] || "",
        horario: row[10] || "",
        usuario_gde: row[11] || "",
        observaciones: row[12] || "",
        direccion_simple: row[15] || "",
        coordinacion: row[16] || "",
        lugar_trabajo: row[17] || "",
      }));
    }

    // 3. Vacaciones 2024 (período vigente)
    if (workbook.SheetNames.includes("Vacaciones 2024")) {
      const raw = XLSX.utils.sheet_to_json(workbook.Sheets["Vacaciones 2024"], { header: 1 });
      result.vacaciones_2024 = raw.slice(2).filter(r => r[0]).map(row => ({
        apellido: row[0] || "",
        nombre: row[1] || "",
        cuil: row[2] || "",
        fecha_ingreso: formatExcelDate(row[3]),
        contrato: row[4] || "",
        dias_corridos: row[5] || 0,
        tomadas: row[6] || 0,
        resto: row[7] || 0,
        observaciones: row[8] || "",
        gde: row[9] || "",
      }));
    }

    // 4. Vacaciones 2025 (solicitudes recientes)
    if (workbook.SheetNames.includes("Vacaciones 2025")) {
      const raw = XLSX.utils.sheet_to_json(workbook.Sheets["Vacaciones 2025"], { header: 1 });
      result.vacaciones_2025 = raw.slice(1).filter(r => r[1]).map(row => ({
        anio: row[0] || "",
        nombre: row[1] || "",
        gde: row[2] || "",
        motivo: row[3] || "",
        fecha: formatExcelDate(row[4]) || row[4] || "",
        cantidad_dias: row[5] || 0,
      }));
    }

    // 5. Normativa de licencias (referencia)
    if (workbook.SheetNames.includes("normativa licencias")) {
      const raw = XLSX.utils.sheet_to_json(workbook.Sheets["normativa licencias"], { header: 1 });
      result.normativa = raw.slice(3).filter(r => r[0] || r[1]).map(row => ({
        nombre_licencia: row[0] || "",
        articulo: row[1] || "",
        modalidad_contratacion: row[2] || "",
        tiempo: row[3] || "",
        con_goce: row[4] || "",
        obligatoria: row[5] || "",
        particularidades: row[6] || "",
      }));
    }

    cachedData = result;
    cacheTime = now;
    return result;
  } catch (error) {
    console.error("Error leyendo el archivo Excel en ruta:", FILE_PATH);
    console.error(error);
    return null;
  }
}

function formatExcelDate(serial) {
  if (!serial || typeof serial !== "number") return serial;
  // Excel serial date to JS date
  const date = new Date((serial - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0];
}
