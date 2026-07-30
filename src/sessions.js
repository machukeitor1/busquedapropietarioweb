const TTL_MS =
  (parseInt(process.env.SESSION_TTL_SECONDS, 10) || 300) * 1000;
const CLEANUP_INTERVAL_MS =
  (parseInt(process.env.SESSION_CLEANUP_SECONDS, 10) || 60) * 1000;

const sessions = new Map();

function crearSesion(rut, userId, cookies) {
  const { v4: uuidv4 } = require("uuid");
  const sessionId = uuidv4();
  const now = Date.now();
  sessions.set(sessionId, {
    rut,
    userId,
    cookies,
    createdAt: now,
    expiresAt: now + TTL_MS,
  });
  return sessionId;
}

function getSesion(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }
  return s;
}

function extenderSesion(sessionId) {
  const s = sessions.get(sessionId);
  if (!s) return false;
  if (Date.now() > s.expiresAt) {
    sessions.delete(sessionId);
    return false;
  }
  s.expiresAt = Date.now() + TTL_MS;
  return true;
}

function eliminarSesion(sessionId) {
  sessions.delete(sessionId);
}

function limpiarExpiradas() {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}

setInterval(limpiarExpiradas, CLEANUP_INTERVAL_MS);

module.exports = {
  crearSesion,
  getSesion,
  extenderSesion,
  eliminarSesion,
};
