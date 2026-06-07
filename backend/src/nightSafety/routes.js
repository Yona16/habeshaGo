const express = require("express");
const env = require("../config/env");

const router = express.Router({ mergeParams: true });

router.post("/start", (req, res) => {
  res.status(env.flags.NIGHT_SAFETY_ENABLED ? 201 : 423).json({
    module: "Mesewa night safety mode",
    enabled: env.flags.NIGHT_SAFETY_ENABLED,
    workflow: ["trusted_driver", "delivery_pin", "emergency_contact", "safety_monitoring", "panic_support"]
  });
});

module.exports = router;
