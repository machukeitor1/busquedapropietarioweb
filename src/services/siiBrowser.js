const { chromium } = require("playwright");

const LOGIN_URL =
  "https://www2.sii.cl/bifurcacion/?originalUrl=https://www2.sii.cl/vica/Menu/ConsultarAntecedentesSC&type=CT";
const TARGET_PREFIX = "/vica/Menu/ConsultarAntecedentesSC";

const HEADLESS = process.env.PLAYWRIGHT_HEADLESS !== "false";
const BROWSER_TIMEOUT = parseInt(process.env.PLAYWRIGHT_TIMEOUT, 10) || 30000;

class SiiBrowser {
  async login(rut, clave) {
    if (!rut || !clave) {
      throw new Error("RUT y clave son requeridos");
    }

    const browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--single-process",
        "--no-zygote",
        "--js-flags=--max-old-space-size=128",
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1366, height: 768 },
        locale: "es-CL",
      });

      const page = await context.newPage();

      await page.goto(LOGIN_URL, {
        waitUntil: "networkidle",
        timeout: BROWSER_TIMEOUT,
      });

      await page.waitForSelector('input[name="rut"]', {
        timeout: BROWSER_TIMEOUT,
      });
      await page.fill('input[name="rut"]', rut);

      await page.waitForSelector('input[name="password"]', {
        timeout: BROWSER_TIMEOUT,
      });
      await page.fill('input[name="password"]', clave);

      await page.click('button[type="submit"]');

      await page.waitForURL((url) => url.includes(TARGET_PREFIX), {
        timeout: BROWSER_TIMEOUT,
      });

      const userId = await page.evaluate(() => {
        const u = localStorage.getItem("userId");
        return u && u !== "null" && u !== "undefined" ? u : "";
      });

      if (!userId) {
        throw new Error(
          "No se pudo obtener userId del localStorage. " +
            "Verifica que el RUT y clave sean correctos."
        );
      }

      const cookies = await context.cookies();
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      return { rut, userId, cookies: cookieHeader };
    } finally {
      await browser.close();
    }
  }
}

module.exports = SiiBrowser;
