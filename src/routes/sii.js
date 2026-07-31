const express = require("express");
const router = express.Router();
const sii = require("../services/siiClient");
const { findComuna } = require("../comunas");

const SII_TIMEOUT = parseInt(process.env.SII_TIMEOUT, 10) || 15000;

// POST /api/sii/buscar  { region, comuna, calle, numero }
router.post("/buscar", async (req, res) => {
  try {
    const { region, comuna, calle, numero } = req.body || {};
    if (!calle || !numero) {
      return res.status(400).json({ error: "Falta calle o numero" });
    }
    const c = findComuna(region, comuna);
    if (!c) {
      return res.status(404).json({ error: "Comuna no encontrada en el catálogo" });
    }

    const predios = await sii.buscarPredios(c, calle, numero, SII_TIMEOUT);
    const conAvaluo = await Promise.all(
      predios.map(async (p) => {
        const av = await sii.consultarAvaluo(c, p.manzana, p.predio, SII_TIMEOUT);
        return { ...p, ...av };
      })
    );

    res.json({ comuna: c, predios: conAvaluo });
  } catch (e) {
    const msg = e.response
      ? `HTTP ${e.response.status} — ${JSON.stringify(e.response.data).slice(0, 300)}`
      : e.message;
    res.status(502).json({ error: msg });
  }
});

// POST /api/sii/cert/eac  { rut, cookies, comunaCnp, manzanaCnp, predioCnp }
router.post("/cert/eac", async (req, res) => {
  try {
    const { rut, cookies, comunaCnp, manzanaCnp, predioCnp } = req.body || {};
    if (!rut || !cookies || !comunaCnp || !manzanaCnp || !predioCnp) {
      return res.status(400).json({ error: "Faltan parámetros (rut, cookies, comunaCnp, manzanaCnp, predioCnp)" });
    }
    const eac = await sii.obtenerUltimoEac(
      rut,
      cookies,
      Number(comunaCnp),
      Number(manzanaCnp),
      Number(predioCnp)
    );
    res.json({ ultimoEacAplicado: eac });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

// POST /api/sii/cert  { rut, cookies, comunaCnp, manzanaCnp, predioCnp, ultimoEacAplicado }
router.post("/cert", async (req, res) => {
  try {
    const { rut, cookies, comunaCnp, manzanaCnp, predioCnp, ultimoEacAplicado } = req.body || {};
    if (!rut || !cookies || !comunaCnp || !manzanaCnp || !predioCnp) {
      return res.status(400).json({ error: "Faltan parámetros" });
    }
    const eac = Number(ultimoEacAplicado) || 0;
    const base64 = await sii.obtenerCertificadoBase64(
      rut,
      cookies,
      Number(comunaCnp),
      Number(manzanaCnp),
      Number(predioCnp),
      eac
    );
    res.json({ base64 });
  } catch (e) {
    const sesionExpirada = /401/.test(e.message);
    res.status(sesionExpirada ? 401 : 502).json({
      error: sesionExpirada ? "Sesión SII expirada" : e.message,
    });
  }
});

module.exports = router;
