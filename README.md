# Búsqueda por Rol CL — Web

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white"/>
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=playwright&logoColor=white"/>
</p>

Versión web de la app Android [Busqueda-por-Rol-CL](https://github.com/machukeitor1/Busqueda-por-Rol-CL). Consulta el **ROL de Avalúo catastral (SII)** de propiedades chilenas por dirección y descarga **Certificados de Deudas de Contribuciones (TGR)** y **Certificados de Antecedentes (SII)**.

API backend en **Node.js + Express** con **Playwright** para login automatizado del SII + frontend SPA integrado.

---

## Características

- **Búsqueda de ROL catastral** por región, comuna, calle y número (API pública SII)
- **Certificado TGR** — descarga directa sin autenticación
- **Certificado SII** — login automatizado con Playwright (Opción A: backend maneja credenciales en memoria)
- Gestión de sesiones con TTL (5 min por defecto)
- Historial de búsquedas (localStorage)
- Frontend SPA responsive (sin frameworks, vanilla JS)

## Requisitos

- Node.js 18+
- Navegadores Chromium (se instalan automáticamente)

## Instalación y ejecución

```bash
# Clonar
git clone https://github.com/machukeitor1/busquedapropietarioweb.git
cd busquedapropietarioweb

# Instalar dependencias
npm install

# Instalar Chromium para Playwright
npx playwright install chromium

# Configurar (opcional)
cp .env.example .env

# Iniciar servidor
npm start              # http://localhost:3000

# Desarrollo con auto-reload
npm run dev            # node --watch
```

## Endpoints de la API

### SII — Búsqueda por dirección (sin autenticación)

```
POST /api/sii/buscar
```
```json
{ "region": "13", "comuna": "Santiago", "calle": "Alonso de Sotomayor", "numero": "2100" }
```
→ `{ "comuna": {...}, "predios": [{ "rol", "direccion", "destino", "manzana", "predio", "total", "afecto", "exento", "agnoSancion" }] }`

### TGR — Certificado de deuda (sin autenticación)

```
POST /api/tgr/certificado
```
```json
{ "region": "13", "comuna": "70", "rol": "12345", "subRol": "1" }
```
→ `{ "filename": "CertTGR_12345_1.pdf", "base64": "..." }`

### SII — Login automatizado (Playwright)

```
POST /api/sii/login
```
```json
{ "rut": "12345678-9", "clave": "miclavetributaria" }
```
→ `{ "sessionId": "uuid", "userId": "12345678-9", "expiresIn": 300 }`

### SII — Certificado de antecedentes (requiere sessionId)

Usando `X-Session-ID` header (o `sessionId` en body):

```
POST /api/sii/cert/eac
X-Session-ID: <uuid>
```
```json
{ "comunaCnp": 13101, "manzanaCnp": 29, "predioCnp": 1234 }
```
→ `{ "ultimoEacAplicado": 2023 }`

```
POST /api/sii/cert
X-Session-ID: <uuid>
```
```json
{ "comunaCnp": 13101, "manzanaCnp": 29, "predioCnp": 1234, "ultimoEacAplicado": 2023 }
```
→ `{ "base64": "JVBERi0xLjcN..." }`

### Gestión de sesiones

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/sii/session/:id` | Verifica si la sesión sigue activa |
| `POST` | `/api/sii/session/:id/extend` | Extiende el TTL de la sesión |
| `POST` | `/api/sii/logout` | Elimina la sesión |

### Catálogo

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/regiones` | Lista de 16 regiones |
| `GET` | `/api/comunas?region=13` | Lista de comunas de una región |

## Arquitectura

```
src/
├── index.js                  # Express app, CORS, rutas
├── sessions.js               # Mapa en memoria de sesiones SII con TTL
├── regiones.js               # Catálogo de regiones
├── comunas.js                # Catálogo de comunas (344)
├── data/
│   ├── regiones.json
│   └── comunas.json
├── routes/
│   ├── sii.js                # Endpoints SII (buscar, login, cert)
│   ├── tgr.js                # Endpoint TGR
│   └── catalog.js            # Regiones y comunas
└── services/
    ├── siiClient.js           # HTTP client para APIs SII (axios)
    ├── siiBrowser.js          # Login automatizado con Playwright
    └── tgrClient.js           # HTTP client para TGR (axios + cookie jar)

public/
├── index.html                # SPA principal (búsqueda + login modal)
└── sii-login.html            # Login vía iframe (alternativa legacy)
```

### Flujo de autenticación SII (Opción A)

1. Usuario ingresa RUT + Clave Tributaria en el modal del frontend
2. Se envía a `POST /api/sii/login`
3. El backend lanza Chromium headless via Playwright, navega al portal SII, llena el formulario y espera el redirect exitoso
4. Extrae `userId` del `localStorage` y cookies de sesión
5. Cierra el navegador — las credenciales se descartan (solo existieron en memoria RAM)
6. Devuelve un `sessionId` al frontend
7. El frontend usa ese `sessionId` para solicitar certificados (TTL: 5 min)

## Variables de entorno (`.env`)

| Variable | Defecto | Descripción |
|----------|---------|-------------|
| `PORT` | `3000` | Puerto del servidor |
| `CORS_ORIGIN` | `*` | Origen permitido para CORS |
| `SII_TIMEOUT` | `15000` | Timeout para APIs SII (ms) |
| `TGR_TIMEOUT` | `30000` | Timeout para TGR (ms) |
| `PLAYWRIGHT_HEADLESS` | `true` | `false` para ver el navegador (debug) |
| `PLAYWRIGHT_TIMEOUT` | `30000` | Timeout para login Playwright (ms) |
| `SESSION_TTL_SECONDS` | `300` | Duración de sesión SII (5 min) |
| `SESSION_CLEANUP_SECONDS` | `60` | Intervalo de limpieza de sesiones |

## Notas técnicas

- Headers HTTP (`Origin`, `Referer`, `User-Agent`) idénticos a la app Android para compatibilidad con los endpoints del SII
- TGR usa cookie jar (`tough-cookie`) para mantener sesión entre `begin.do` y la descarga del certificado
- El catálogo de comunas se genera desde `MainActivity.kt` con `npm run gen-comunas`
- El PDF del certificado SII se devuelve en base64; el frontend lo convierte a Blob y dispara la descarga

## Licencia

Proyecto educativo. Datos públicos del Servicio de Impuestos Internos (SII) y Tesorería General de la República (TGR) de Chile.
