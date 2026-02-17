const crypto = require("crypto");

const SESSION_COOKIE_NAME = "sid";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;
const sessions = new Map();

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split("=");
      acc[key] = decodeURIComponent(rest.join("="));
      return acc;
    }, {});
}

function setSessionCookie(res, sid) {
  const cookie = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(sid)}`,
    "Path=/",
    "HttpOnly",
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`,
    "SameSite=Lax"
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
}

function createSession(res, data) {
  const sid = crypto.randomUUID();
  sessions.set(sid, { ...data, createdAt: Date.now() });
  setSessionCookie(res, sid);
}

function destroySession(req, res) {
  if (req.sessionId) {
    sessions.delete(req.sessionId);
  }
  clearSessionCookie(res);
}

function sessionMiddleware(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie || "");
  const sid = cookies[SESSION_COOKIE_NAME];
  req.sessionId = sid || null;
  req.session = sid ? sessions.get(sid) || null : null;
  next();
}

module.exports = {
  createSession,
  destroySession,
  sessionMiddleware
};
