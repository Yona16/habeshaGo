const express = require("express");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/:id/merchants", (req, res) => {
  res.json({
    module: "Seb Seb neighborhood commerce",
    neighborhood_id: req.params.id,
    merchants: store.merchants.filter((merchant) => merchant.country_id === req.countryId && merchant.city_id === req.params.id)
  });
});

module.exports = router;
