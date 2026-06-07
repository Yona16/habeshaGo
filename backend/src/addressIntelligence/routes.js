const express = require("express");

const router = express.Router({ mergeParams: true });

router.post("/verify", (req, res) => {
  res.status(202).json({
    module: "Sened trust and smart address intelligence",
    status: "verification_requested",
    captured_fields: ["gps", "landmark", "woreda", "sub_city", "gate_color", "building_name", "driver_notes", "customer_notes"],
    child_safety_note: "Avoid unnecessary child photos; use PIN, GPS, and guardian notifications."
  });
});

module.exports = router;
