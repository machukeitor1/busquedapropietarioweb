const express = require("express");
const router = express.Router();
const SiiBrowser = require("../services/siiBrowser");
const sessions = require("../sessions");
const sii = require("../services/siiClient");
const { findComuna } = require("../comunas");

const SII_TIMEOUT = parseInt(process.env.SII_TIMEOUT, 10) || 15000;

function resolverSesion(req) {
  const sessionId =
    req.body?.sessionId || req.headers["x-session-id"];
  if (sessionId) {
    const s = sessions.getSesion(sessionId);
    if (s) return s;
  }
  return null;
}

// POST /api/sii/login  { rut, clave }
router.post("/login", async (req, res) => {
  try {
    const { rut, clave } = req.body || {};
    if (!rut || !clave) {
      return res.status(400).json({ error: "Faltan rut o clave" });
    }
    const browser = new SiiBrowser();
    const sesion = await browser.login(rut, clave);
    const sessionId = sessions.crearSesion(
      sesion.rut,
      sesion.userId,
      sesion.cookies
    );
    res.json({
      sessionId,
      userId: sesion.userId,
      expiresIn: parseInt(process.env.SESSION_TTL_SECONDS, 10) || 300,
    });
  } catch (e) {
    const msg =
      e.message.includes("timeout")
        ? "Timeout: el portal SII no respondió a tiempo"
        : e.message;
    res.status(502).json({ error: msg });
  }
});

// GET /api/sii/session/:id
router.get("/session/:id", (req, res) => {
  const s = sessions.getSesion(req.params.id);
  if (!s) {
    return res.status(404).json({ error: "Sesión no encontrada o expirada" });
  }
  res.json({ rut: s.rut, userId: s.userId, active: true });
});

// POST /api/sii/session/:id/extend
router.post("/session/:id/extend", (req, res) => {
  const ok = sessions.extenderSesion(req.params.id);
  if (!ok) {
    return res.status(404).json({ error: "Sesión no encontrada o expirada" });
  }
  res.json({ extended: true });
});

// POST /api/sii/logout
router.post("/logout", (req, res) => {
  const sessionId =
    req.body?.sessionId || req.headers["x-session-id"];
  if (sessionId) sessions.eliminarSesion(sessionId);
  res.json({ ok: true });
});

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

// POST /api/sii/cert/eac — acepta sessionId O rut+cookies
router.post("/cert/eac", async (req, res) => {
  try {
    const sesion = resolverSesion(req);
    const rut = sesion?.rut || req.body?.rut;
    const cookies = sesion?.cookies || req.body?.cookies;
    const { comunaCnp, manzanaCnp, predioCnp } = req.body || {};

    if (!rut || !cookies || !comunaCnp || !manzanaCnp || !predioCnp) {
      return res.status(400).json({
        error:
          "Faltan parámetros. Envía sessionId en header X-Session-ID o body, o rut+cookies+comunaCnp+manzanaCnp+predioCnp",
      });
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

// POST /api/sii/cert — acepta sessionId O rut+cookies
router.post("/cert", async (req, res) => {
  try {
    const sesion = resolverSesion(req);
    const rut = sesion?.rut || req.body?.rut;
    const cookies = sesion?.cookies || req.body?.cookies;
    const { comunaCnp, manzanaCnp, predioCnp, ultimoEacAplicado } =
      req.body || {};

    if (!rut || !cookies || !comunaCnp || !manzanaCnp || !predioCnp) {
      return res.status(400).json({
        error:
          "Faltan parámetros. Envía sessionId en header X-Session-ID o body, o rut+cookies+comunaCnp+manzanaCnp+predioCnp",
      });
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
