const express = require("express");

const router = express.Router({ mergeParams: true });

router.post("/join", (req, res) => {
  res.status(202).json({
    module: "Ende Guzo community delivery",
    status: "matched_pending",
    rule: "Combine nearby building, compound, dormitory, or office orders only with customer consent."
  });
});

module.exports = router;
