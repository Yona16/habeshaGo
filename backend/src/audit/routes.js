const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/logs", authenticate, requireRole("admin"), (req, res) => {
  res.json({ logs: store.auditLogs.filter((log) => !log.country_id || log.country_id === req.countryId) });
});

module.exports = router;
