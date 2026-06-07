const jwt = require("jsonwebtoken");
const env = require("../config/env");
const store = require("../database/demoStore");

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, country_id: user.country_id }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing bearer token" });
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = store.users.find((item) => item.id === payload.sub);
    if (!user || user.status !== "active") return res.status(401).json({ error: "Invalid session" });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions", required: roles });
    }
    next();
  };
}

module.exports = { signToken, authenticate, requireRole };
