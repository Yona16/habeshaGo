function notFound(req, res) {
  res.status(404).json({ error: "Route not found", path: req.originalUrl });
}

function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  const payload = { error: error.message || "Internal server error" };
  if (process.env.NODE_ENV !== "production" && status === 500) payload.stack = error.stack;
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
