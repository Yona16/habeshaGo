const express = require("express");
const store = require("../database/demoStore");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ countries: store.countries });
});

module.exports = router;
