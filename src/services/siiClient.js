const axios = require("axios");
const { v4: uuidv4 } = (() => {
  // UUID simple sin dependencia extra (estilo conversationId del SII)
  function v4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  return { v4 };
})();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const API_URL =
  "https://www4.sii.cl/mapasui/services/data/mapasFacadeService/getPrediosDireccion";
const AVALUO_URL =
  "https://www4.sii.cl/mapasui/services/data/mapasFacadeService/getPredioNacional";

const SII_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  Origin: "https://www4.sii.cl",
  Referer: "https://www4.sii.cl/mapasui/internet/",
  "X-Requested-With": "XMLHttpRequest",
  "User-Agent": UA,
};

function metaData(namespace) {
  return {
    namespace,
    conversationId: "UNAUTHENTICATED-CALL",
    transactionId: uuidv4(),
  };
}

// Equivalente a consultarAPI (MainActivity.kt)
async function buscarPredios(comuna, calle, numero, timeout = 15000) {
  const body = {
    metaData: metaData(
      "cl.sii.sdi.lob.bbrr.mapas.data.api.interfaces.MapasFacadeService/getPrediosDireccion"
    ),
    data: {
      rolDireccion: {
        comuna: comuna.codigoSii,
        nombreComuna: comuna.nombreApi,
        calle: calle.toLowerCase().trim(),
        numeroCalleStr: numero.trim(),
        detalle: 0,
      },
      servicios: [],
    },
  };

  const { data } = await axios.post(API_URL, body, {
    headers: SII_HEADERS,
    timeout,
  });

  const arr = data && data.data;
  if (!Array.isArray(arr)) return [];
  return arr.map((p) => ({
    rol: p.rol || "-",
    direccion: (p.direccion || "-").trim(),
    destino: p.destinoDescripcion || "-",
    comuna: p.nombreComuna || "-",
    manzana: parseInt(p.manzana, 10) || 0,
    predio: parseInt(p.predio, 10) || 0,
  }));
}

// Equivalente a consultarAvaluo (MainActivity.kt)
async function consultarAvaluo(comuna, manzana, predio, timeout = 15000) {
  const body = {
    metaData: metaData(
      "cl.sii.sdi.lob.bbrr.mapas.data.api.interfaces.MapasFacadeService/getPredioNacional"
    ),
    data: {
      predio: {
        comuna: comuna.codigoSii,
        manzana: String(manzana),
        predio: String(predio),
      },
      servicios: [],
    },
  };

  try {
    const { data } = await axios.post(AVALUO_URL, body, {
      headers: SII_HEADERS,
      timeout,
    });
    const d = (data && data.data) || {};
    return {
      total: parseInt(d.valorTotal, 10) || 0,
      afecto: parseInt(d.valorAfecto, 10) || 0,
      exento: parseInt(d.valorExento, 10) || 0,
      agnoSancion: parseInt(d.agnoSancion, 10) || 0,
    };
  } catch (e) {
    return { total: 0, afecto: 0, exento: 0, agnoSancion: 0 };
  }
}

// ── Certificado SII (requiere sesión del usuario: rut + cookies) ──────────────
// Equivalente a obtenerUltimoEac (SiiCertificadoActivity.kt)
async function obtenerUltimoEac(rut, cookies, comunaCnp, manzanaCnp, predioCnp, timeout = 20000) {
  const url = `https://www2.sii.cl/app/vica/${rut}/v1/mis-bbrr/obtener/by-rol-sc`;
  const body = { comunaCnp, manzanaCnp, predioCnp };
  try {
    const { data } = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/plain, */*",
        Origin: "https://www2.sii.cl",
        Referer: "https://www2.sii.cl/vica/Menu/ConsultarAntecedentesSC",
        "User-Agent": UA,
        Cookie: cookies,
      },
      timeout,
    });
    if (Array.isArray(data) && data.length > 0) {
      return parseInt(data[0].ultimoEacAplicado, 10) || 0;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

// Equivalente a obtenerCertificadoBase64 (SiiCertificadoActivity.kt)
async function obtenerCertificadoBase64(
  rut,
  cookies,
  comunaCnp,
  manzanaCnp,
  predioCnp,
  eac,
  timeout = 60000
) {
  const url = `https://www2.sii.cl/app/vica/${rut}/v1/cert-antecedentes/post/terceros-sc`;
  const body = {
    tipoDocumento: "7",
    tipoSolicitante: "1",
    motivo: "0",
    institucionReceptor: "0",
    tipoSolicitud: 1,
    bienesRaices: [
      {
        comunaCnp,
        manzanaCnp,
        predioCnp,
        ultimoEacAplicado: eac,
      },
    ],
  };

  const { data } = await axios.post(url, body, {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain, */*",
      Origin: "https://www2.sii.cl",
      Referer: "https://www2.sii.cl/vica/Menu/ConsultarAntecedentesSC",
      "User-Agent": UA,
      Cookie: cookies,
    },
    timeout,
  });
  return typeof data === "string" ? data.trim() : String(data).trim();
}

module.exports = {
  UA,
  buscarPredios,
  consultarAvaluo,
  obtenerUltimoEac,
  obtenerCertificadoBase64,
};
