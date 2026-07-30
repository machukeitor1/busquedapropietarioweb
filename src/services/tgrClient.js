const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const tough = require("tough-cookie");

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const BEGIN_URL =
  "https://www.tesoreria.cl/CertDeudasRolCutAixWeb/begin.do";
const CERT_URL =
  "https://www.tesoreria.cl/CertDeudasRolCutAixWeb/TraerCertificadoDeudasAction.do";
const REFERER =
  "https://www.tgr.cl/tramites-tgr/certificado-de-deuda-de-contribuciones/";

const client = wrapper(
  axios.create({
    // Jar de cookies por instancia: begin.do fija la sesión que reutiliza el cert.
    jar: new tough.CookieJar(),
    withCredentials: true,
    maxRedirects: 5,
  })
);

function formBody(region, comuna, rol, subRol) {
  const params = new URLSearchParams();
  params.append("region", region);
  params.append("comuna", comuna);
  params.append("rol", rol);
  params.append("subRol", subRol);
  params.append("g-recaptcha-response", "");
  return params.toString();
}

// Equivalente a obtenerSesion + obtenerCertificadoHtml (TgrActivity.kt)
async function obtenerCertificadoHtml(region, comuna, rol, subRol, timeout = 30000) {
  const body = formBody(region, comuna, rol, subRol);

  await client.post(BEGIN_URL, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: REFERER,
    },
    timeout,
  });

  const resp = await client.post(CERT_URL, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Referer: BEGIN_URL,
    },
    responseType: "arraybuffer",
    timeout,
    transformResponse: [(d) => d],
  });

  if (resp.status !== 200) {
    throw new Error(`Error HTTP ${resp.status} al obtener certificado TGR`);
  }
  // El SII/TGR devuelve el HTML en ISO-8859-1
  return Buffer.from(resp.data).toString("latin1");
}

// Extrae el base64 del PDF embebido en el HTML (extraerBase64Pdf)
function extraerBase64Pdf(html) {
  const marker = "data:application/pdf;base64,";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  let raw = html.substring(start + marker.length);
  // En la respuesta real de TGR el data URI va entre comillas.
  const quoteEnd = raw.indexOf('"');
  if (quoteEnd !== -1) raw = raw.substring(0, quoteEnd);
  // Recorte de seguridad si la respuesta trae HTML sin comillas (páginas de error).
  const lt = raw.indexOf("<");
  if (lt !== -1) raw = raw.substring(0, lt);
  const b64 = raw
    .split("")
    .filter((c) => /[A-Za-z0-9+/=]/.test(c))
    .join("");
  // El PDF debe ser válido: comienza con %PDF.
  if (!b64.startsWith("JVBER")) return null;
  return b64.length ? b64 : null;
}

async function descargarCertificado(region, comuna, rol, subRol, timeout = 30000) {
  const html = await obtenerCertificadoHtml(region, comuna, rol, subRol, timeout);
  const b64 = extraerBase64Pdf(html);
  if (!b64) {
    throw new Error("El servidor no devolvió el PDF. Verifica que el ROL exista en TGR.");
  }
  return b64;
}

module.exports = { descargarCertificado, extraerBase64Pdf, UA };
