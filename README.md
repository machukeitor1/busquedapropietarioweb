# Busqueda por Rol CL — Backend Web

Backend en **Node.js + Express** que expone la lógica de la app Android
(`app/`) para consultar el **ROL de Avalúo catastral (SII)** y descargar
certificados **TGR** y **SII** de Chile desde un servidor.

> Versión móvil: `../app` (Android/Kotlin). Esta carpeta `web/` es independiente.

## Requisitos
- Node.js 18+

## Instalación
```bash
cd web
npm install
cp .env.example .env   # opcional
npm run gen-comunas    # regenera el catálogo desde la app Android (ya incluido)
npm start              # http://localhost:3000
```

## Endpoints

### SII — búsqueda por dirección (sin autenticación)
`POST /api/sii/buscar`
```json
{ "region": "13", "comuna": "Santiago", "calle": "Alonso de Sotomayor", "numero": "2100" }
```
Respuesta: `{ "comuna": {...}, "predios": [ { rol, direccion, destino, manzana, predio, total, afecto, exento, agnoSancion } ] }`

### TGR — certificado de deuda de contribuciones (sin autenticación)
`POST /api/tgr/certificado`
```json
{ "region": "13", "comuna": "70", "rol": "12345", "subRol": "1" }
```
Respuesta: `{ "filename": "CertTGR_12345_1.pdf", "base64": "..." }`

### SII — certificado de antecedentes (requiere sesión del usuario)
El usuario inicia sesión con su **Clave Tributaria**; el cliente envía
`rut` + `cookies` de sesión (el servidor nunca ve la clave).

`POST /api/sii/cert/eac` → `{ rut, cookies, comunaCnp, manzanaCnp, predioCnp }`
devuelve `{ "ultimoEacAplicado": 0 }`.

`POST /api/sii/cert` → `{ rut, cookies, comunaCnp, manzanaCnp, predioCnp, ultimoEacAplicado }`
devuelve `{ "base64": "..." }` (PDF).

Frontend de ayuda: `http://localhost:3000/sii-login.html` (iframe de login SII + captura de cookies).

## Notas de implementación
- Headers `Origin/Referer/X-Requested-With/User-Agent` idénticos a la app Android.
- TGR usa un cookie jar (`tough-cookie`) para mantener la sesión entre `begin.do` y el certificado.
- El catálogo de ~346 comunas (`src/data/comunas.json`) se genera desde
  `app/.../MainActivity.kt` con `npm run gen-comunas`.
- El certificado SII necesita login interactivo: en un WebView se inyecta JS
  para leer `localStorage.userId` + cookies (ver contrato `window.SiiBridge`
  en `public/sii-login.html`). En un navegador normal no se pueden leer las
  cookies cross-origin, por lo que ahí se pegan manualmente.
