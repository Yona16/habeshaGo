const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.post("/", authenticate, requireRole("merchant", "admin"), (req, res) => {
  const product = {
    id: randomUUID(),
    merchant_id: req.body.merchant_id,
    country_id: req.countryId,
    city_id: req.body.city_id || req.user.city_id,
    currency: req.country.currency,
    language: req.body.language || req.user.language,
    timezone: req.country.timezone,
    name: req.body.name,
    category: req.body.category || "food",
    price: Number(req.body.price),
    available: req.body.available !== false
  };
  store.products.push(product);
  res.status(201).json({ product });
});

router.patch("/:id", authenticate, requireRole("merchant", "admin"), (req, res) => {
  const product = store.products.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  Object.assign(product, req.body, { id: product.id, country_id: product.country_id });
  res.json({ product });
});

router.delete("/:id", authenticate, requireRole("merchant", "admin"), (req, res) => {
  const product = store.products.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!product) return res.status(404).json({ error: "Product not found" });
  product.available = false;
  res.status(202).json({ product, message: "Product disabled to preserve order history." });
});

module.exports = router;
