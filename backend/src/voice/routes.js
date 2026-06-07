const express = require("express");
const env = require("../config/env");

const router = express.Router({ mergeParams: true });

router.post("/command", (req, res) => {
  res.status(env.flags.VOICE_ORDERING_ENABLED ? 202 : 423).json({
    module: "Tenagn voice-first mode",
    enabled: env.flags.VOICE_ORDERING_ENABLED,
    supported_commands: ["search", "order", "checkout_confirmation", "tracking", "support"],
    supported_languages: ["am", "en", "sw"],
    safety_rule: "Voice ordering must confirm final basket, address, total, and payment method before placement.",
    received: req.body
  });
});

module.exports = router;
