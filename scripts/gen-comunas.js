// Genera src/data/comunas.json a partir del catálogo embebido en la app Android
// (app/src/main/java/cl/machukeitor/siirol/MainActivity.kt -> todasLasComunas).
// Se mantiene como fuente de verdad el código móvil para no transcribir a mano.
const fs = require("fs");
const path = require("path");

const SRC = path.resolve(
  __dirname,
  "..",
  "..",
  "app",
  "src",
  "main",
  "java",
  "cl",
  "machukeitor",
  "siirol",
  "MainActivity.kt"
);
const OUT = path.resolve(__dirname, "..", "src", "data", "comunas.json");

const kotlin = fs.readFileSync(SRC, "utf8");
const re = /Comuna\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)",\s*(-?[\d.]+)f,\s*(-?[\d.]+)f\s*\)/g;

const comunas = [];
let m;
while ((m = re.exec(kotlin)) !== null) {
  comunas.push({
    codigoSii: m[1],
    nombre: m[2],
    nombreApi: m[3],
    tgrRegion: m[4],
    tgrComuna: m[5],
    lat: parseFloat(m[6]),
    lon: parseFloat(m[7]),
  });
}

if (comunas.length === 0) {
  console.error("No se encontraron comunas. ¿Ruta correcta?", SRC);
  process.exit(1);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(comunas, null, 2));
console.log(`Generadas ${comunas.length} comunas -> ${OUT}`);
