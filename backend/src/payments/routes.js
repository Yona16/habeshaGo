const express = require("express");

const providersByCountry = {
  ET: ["Telebirr", "Chapa", "Cash"],
  KE: ["M-Pesa", "Airtel Money", "Card", "Cash"],
  TZ: ["M-Pesa", "Tigo Pesa", "Airtel Money"],
  UG: ["MTN MoMo", "Airtel Money"],
  RW: ["MoMo", "Airtel Money", "Card"],
  SS: ["MTN MoMo", "Zain Cash", "Cash"]
};

const router = express.Router({ mergeParams: true });

router.get("/methods", (req, res) => {
  res.json({
    country_id: req.countryId,
    currency: req.country.currency,
    providers: providersByCountry[req.countryId] || ["Cash"],
    abstraction: "Provider-specific integrations should implement authorize, capture, refund, webhookVerify, and reconcile."
  });
});

module.exports = router;
