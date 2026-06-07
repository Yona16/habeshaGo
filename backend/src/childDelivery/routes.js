const express = require("express");
const env = require("../config/env");

const router = express.Router({ mergeParams: true });

router.post("/create", (req, res) => {
  res.status(env.flags.CHILD_DELIVERY_ENABLED ? 201 : 423).json({
    module: "Lijoch family safety delivery",
    enabled: env.flags.CHILD_DELIVERY_ENABLED,
    required: ["guardian_account", "delivery_pin", "guardian_notifications", "school_or_safe_location_confirmation"],
    restricted: ["unnecessary_child_photo_storage"]
  });
});

module.exports = router;
