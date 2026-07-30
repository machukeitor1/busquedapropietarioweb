const express = require("express");
const router = express.Router();
const { regiones } = require("../regiones");
const { comunas } = require("../comunas");

// GET /api/regiones -> [{ nombre, tgrCode }]
router.get("/regiones", (req, res) => res.json(regiones));

// GET /api/comunas?region=13 -> [{ codigoSii, nombre, tgrRegion, tgrComuna }]
router.get("/comunas", (req, res) => {
  const region = req.query.region;
  if (!region) return res.status(400).json({ error: "Falta region" });
  const lista = comunas
    .filter((c) => c.tgrRegion === String(region))
    .map((c) => ({
      codigoSii: c.codigoSii,
      nombre: c.nombre,
      tgrRegion: c.tgrRegion,
      tgrComuna: c.tgrComuna,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  res.json(lista);
});

module.exports = router;
