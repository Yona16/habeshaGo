const express = require("express");

const router = express.Router({ mergeParams: true });

router.post("/voice", (req, res) => {
  res.status(202).json({
    module: "Weynos voice note referral network",
    status: "queued",
    referral_credit_ready: true,
    privacy_note: "Contacts and voice notes require explicit user consent before storage."
  });
});

module.exports = router;
