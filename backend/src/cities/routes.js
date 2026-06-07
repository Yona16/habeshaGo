const express = require("express");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/", (req, res) => {
  res.json({ cities: store.cities.filter((city) => city.country_id === req.countryId) });
});

module.exports = router;
