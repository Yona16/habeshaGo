const express = require("express");
const env = require("../config/env");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/", (req, res) => {
  res.json({ flags: store.flags.map((flag) => ({ ...flag, enabled: Boolean(env.flags[flag.key]) })) });
});

module.exports = router;
