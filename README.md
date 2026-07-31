# Búsqueda por Rol CL — Web

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white"/>
</p>

Versión web de la app Android [Busqueda-por-Rol-CL](https://github.com/machukeitor1/Busqueda-por-Rol-CL). Consulta el **ROL de Avalúo catastral** de propiedades chilenas por dirección (comuna, calle y número) usando la API pública del **Servicio de Impuestos Internos (SII)**, y descarga el **Certificado de Antecedentes SII** en PDF.

Backend en **Node.js + Express** + frontend SPA integrado (vanilla JS, sin frameworks).

---

## Características

- 🔍 **Búsqueda de ROL catastral** por región, comuna, calle y número (API pública SII)
- 📄 **Certificado de Antecedentes SII** — el usuario inicia sesión con su Clave Tributaria y descarga el PDF
- 🕐 **Historial de búsquedas** (localStorage, últimos 5)
- 📱 **Frontend responsive** — HTML/CSS/JS puro, sin dependencias

## Requisitos

- Node.js 18+

## Instalación y ejecución

### Opción 1 — Script para Windows (`iniciar.bat`)

Doble click en `iniciar.bat` y abre `http://localhost:3000` automáticamente.

### Opción 2 — Manual

```bash
# Clonar
git clone https://github.com/machukeitor1/busquedapropietarioweb.git
cd busquedapropietarioweb

# Instalar dependencias
npm install

# Configurar (opcional)
cp .env.example .env

# Iniciar servidor
npm start              # http://localhost:3000

# Desarrollo con auto-reload
npm run dev            # node --watch
```

## Uso

1. Elige **región** y **comuna**.
2. Escribe **calle** (sin tildes) y **número**.
3. Click en **Buscar ROL** → muestra los predios encontrados con su avalúo fiscal.
4. Para descargar el **Certificado SII**, abre el enlace del resultado:
   - Inicia sesión con tu **Clave Tributaria** en la página del SII.
   - Pega las **cookies de sesión** y los datos del predio en el formulario.
   - Genera y descarga el PDF.

> 💡 La calle debe ir sin tildes y en minúsculas (igual que en la app Android).

## Endpoints de la API

### SII — Búsqueda por dirección (sin autenticación)

```
POST /api/sii/buscar
```
```json
{ "region": "13", "comuna": "Santiago", "calle": "Alonso de Sotomayor", "numero": "2100" }
```
→ `{ "comuna": {...}, "predios": [{ "rol", "direccion", "destino", "manzana", "predio", "total", "afecto", "exento", "agnoSancion" }] }`

### SII — Certificado de antecedentes (requiere sesión del usuario)

El usuario se autentica con su Clave Tributaria; el frontend envía `rut` + `cookies` de sesión (el servidor nunca ve la clave).

```
POST /api/sii/cert/eac
```
```json
{ "rut": "12345678-9", "cookies": "JSESSIONID=...", "comunaCnp": 13101, "manzanaCnp": 29, "predioCnp": 1234 }
```
→ `{ "ultimoEacAplicado": 2023 }`

```
POST /api/sii/cert
```
```json
{ "rut": "12345678-9", "cookies": "JSESSIONID=...", "comunaCnp": 13101, "manzanaCnp": 29, "predioCnp": 1234, "ultimoEacAplicado": 2023 }
```
→ `{ "base64": "JVBERi0xLjcN..." }` (PDF)

### Catálogo

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/regiones` | Lista de 16 regiones de Chile |
| `GET` | `/api/comunas?region=13` | Lista de comunas de una región |

## Arquitectura

```
src/
├── index.js                  # Express app, CORS, rutas
├── regiones.js               # Catálogo de regiones
├── comunas.js                # Catálogo de comunas (344)
├── data/
│   ├── regiones.json
│   └── comunas.json
├── routes/
│   ├── sii.js                # Endpoints SII (buscar, cert/eac, cert)
│   └── catalog.js            # Regiones y comunas
└── services/
    └── siiClient.js           # HTTP client para APIs SII (axios)

public/
├── index.html                # SPA principal (búsqueda + resultados)
└── sii-login.html            # Flujo de certificado SII (login manual + cookies)
```

### Flujo del certificado SII

1. El usuario encuentra el predio buscando por dirección.
2. Abre `sii-login.html`, donde puede iniciar sesión con su Clave Tributaria en el portal del SII.
3. Copia las **cookies de sesión** (y su RUT) y las pega en el formulario junto con los datos del predio (comuna, manzana, predio).
4. El backend consulta `ultimoEacAplicado` (`/api/sii/cert/eac`) y luego genera el PDF (`/api/sii/cert`).
5. El PDF se descarga como archivo en el navegador.

Las credenciales **nunca** viajan al backend — solo las cookies de sesión, que expiran en ~5 minutos en el SII.

## Variables de entorno (`.env`)

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `SII_TIMEOUT` | `15000` | Timeout para APIs SII (ms) |

## Despliegue en Fly.io

El proyecto incluye `Dockerfile` y `fly.toml` listos para Fly.io:

```bash
# Instalar flyctl
winget install flyctl

# Login
fly auth login

# Crear la app (primera vez)
fly launch --no-deploy --dockerfile Dockerfile

# Desplegar
fly deploy
```

> La imagen usa `node:22-alpine` — build rápido y liviano. Para mantener la app despierta en el plan gratis, programa un ping a `/health` cada 5 minutos (ej. cron-job.org).

## Notas técnicas

- Headers HTTP (`Origin`, `Referer`, `User-Agent`) idénticos a la app Android para compatibilidad con los endpoints del SII.
- El catálogo de comunas se genera desde `MainActivity.kt` con `npm run gen-comunas`.
- El PDF del certificado SII se devuelve en base64; el frontend lo convierte a Blob y dispara la descarga.

## Licencia

Proyecto educativo. Datos públicos del Servicio de Impuestos Internos (SII) de Chile.
