const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'data', 'Licencias Firma Digital.xlsx');
const workbook = XLSX.readFile(filePath);

console.log("=== PESTAÑAS ===");
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(name => {
  const sheet = workbook.Sheets[name];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== ${name} (${data.length} filas) ===`);
  // Mostrar las primeras 5 filas
  data.slice(0, 5).forEach((row, i) => {
    console.log(`Fila ${i}: ${JSON.stringify(row)}`);
  });
});
