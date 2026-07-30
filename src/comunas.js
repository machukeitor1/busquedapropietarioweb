const fs = require("fs");
const path = require("path");

const comunas = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "data", "comunas.json"), "utf8")
);

function findByCodigoSii(codigoSii) {
  return comunas.find((c) => c.codigoSii === String(codigoSii)) || null;
}

// Acepta nombre (con o sin tildes) o código SII, dentro de una región TGR opcional.
function findComuna(region, comuna) {
  if (!comuna) return null;
  const q = String(comuna).trim().toLowerCase();
  const qNorm = q.normalize("NFD").replace(/\p{Mark}/gu, "");
  return (
    comunas.find((c) => c.codigoSii === q) ||
    comunas.find((c) => {
      if (region && c.tgrRegion !== String(region)) return false;
      const name = c.nombre.toLowerCase();
      const nameNorm = name.normalize("NFD").replace(/\p{Mark}/gu, "");
      return name === q || nameNorm === qNorm;
    }) ||
    null
  );
}

module.exports = { comunas, findByCodigoSii, findComuna };
