const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.use(authenticate, requireRole("customer", "admin"));

router.get("/", (req, res) => {
  res.json({ items: store.cartItems.filter((item) => item.user_id === req.user.id && item.country_id === req.countryId) });
});

router.post("/items", (req, res) => {
  const product = store.products.find((item) => item.id === req.body.product_id && item.country_id === req.countryId && item.available);
  if (!product) return res.status(404).json({ error: "Product not found or unavailable" });
  const item = { id: randomUUID(), user_id: req.user.id, country_id: req.countryId, product_id: product.id, merchant_id: product.merchant_id, quantity: Number(req.body.quantity || 1), unit_price: product.price, currency: product.currency };
  store.cartItems.push(item);
  res.status(201).json({ item });
});

router.patch("/items/:id", (req, res) => {
  const item = store.cartItems.find((entry) => entry.id === req.params.id && entry.user_id === req.user.id);
  if (!item) return res.status(404).json({ error: "Cart item not found" });
  item.quantity = Number(req.body.quantity || item.quantity);
  res.json({ item });
});

router.delete("/items/:id", (req, res) => {
  const index = store.cartItems.findIndex((entry) => entry.id === req.params.id && entry.user_id === req.user.id);
  if (index < 0) return res.status(404).json({ error: "Cart item not found" });
  const [item] = store.cartItems.splice(index, 1);
  res.json({ removed: item });
});

module.exports = router;
