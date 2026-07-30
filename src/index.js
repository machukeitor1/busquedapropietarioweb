const express = require("express");
const cors = require("cors");
const path = require("path");
const siiRoutes = require("./routes/sii");
const tgrRoutes = require("./routes/tgr");
const catalogRoutes = require("./routes/catalog");

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/sii", siiRoutes);
app.use("/api/tgr", tgrRoutes);
app.use("/api", catalogRoutes);

// Frontend de login SII (opción 1: captura de cookies en cliente WebView)
app.use(express.static(path.resolve(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`Busqueda-por-Rol-CL (web) escuchando en http://localhost:${PORT}`);
});
