const express = require("express");

const router = express.Router({ mergeParams: true });

router.post("/accounts", (req, res) => {
  res.status(201).json({
    module: "Gasha senior account",
    status: "created_placeholder",
    features: ["large_text", "priority_support", "family_notification", "trusted_driver_preference", "phone_support"]
  });
});

module.exports = router;
