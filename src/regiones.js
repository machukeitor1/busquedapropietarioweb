const fs = require("fs");
const path = require("path");

const regiones = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "data", "regiones.json"), "utf8")
);

module.exports = { regiones };
