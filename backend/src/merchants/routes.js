const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/", (req, res) => {
  const { city, category, women_owned } = req.query;
  const merchants = store.merchants.filter((merchant) =>
    merchant.country_id === req.countryId &&
    (!city || merchant.city_id === city) &&
    (!category || merchant.category === category) &&
    (women_owned === undefined || String(merchant.women_owned) === String(women_owned))
  );
  res.json({ merchants });
});

router.get("/:id", (req, res) => {
  const merchant = store.merchants.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });
  res.json({ merchant });
});

router.post("/", authenticate, requireRole("merchant", "admin"), (req, res) => {
  const merchant = {
    id: randomUUID(),
    owner_user_id: req.user.id,
    country_id: req.countryId,
    city_id: req.body.city_id || req.user.city_id,
    currency: req.country.currency,
    language: req.body.language || req.user.language,
    timezone: req.country.timezone,
    name: req.body.name,
    category: req.body.category || "restaurant",
    women_owned: Boolean(req.body.women_owned),
    verified: false,
    status: "pending",
    commission_rate: Number(req.body.commission_rate || 0.12),
    address_note: req.body.address_note || ""
  };
  store.merchants.push(merchant);
  res.status(201).json({ merchant });
});

router.patch("/:id", authenticate, requireRole("merchant", "admin"), (req, res) => {
  const merchant = store.merchants.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });
  Object.assign(merchant, req.body, { id: merchant.id, country_id: merchant.country_id });
  res.json({ merchant });
});

router.get("/:id/products", (req, res) => {
  res.json({ products: store.products.filter((product) => product.merchant_id === req.params.id && product.country_id === req.countryId) });
});

module.exports = router;
