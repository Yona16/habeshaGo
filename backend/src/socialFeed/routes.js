const express = require("express");
const env = require("../config/env");

const router = express.Router({ mergeParams: true });

router.get("/", (req, res) => {
  res.status(env.flags.SOCIAL_FEED_ENABLED ? 200 : 423).json({
    module: "Yene Guzo hyperlocal social feed",
    enabled: env.flags.SOCIAL_FEED_ENABLED,
    planned_content: ["popular_dishes", "daily_specials", "merchant_promotions", "driver_stories", "neighborhood_trends"]
  });
});

module.exports = router;
