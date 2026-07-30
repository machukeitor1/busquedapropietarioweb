const express = require("express");
const router = express.Router();
const tgr = require("../services/tgrClient");

const TGR_TIMEOUT = parseInt(process.env.TGR_TIMEOUT, 10) || 30000;

// POST /api/tgr/certificado  { region, comuna, rol, subRol }
router.post("/certificado", async (req, res) => {
  try {
    const { region, comuna, rol, subRol } = req.body || {};
    if (!region || !comuna || !rol) {
      return res.status(400).json({ error: "Faltan region, comuna o rol" });
    }
    const base64 = await tgr.descargarCertificado(
      String(region),
      String(comuna),
      String(rol),
      String(subRol || ""),
      TGR_TIMEOUT
    );
    const filename = `CertTGR_${rol}${subRol ? "_" + subRol : ""}.pdf`;
    res.json({ filename, base64 });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

module.exports = router;
