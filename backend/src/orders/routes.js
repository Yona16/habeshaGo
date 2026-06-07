const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.post("/", authenticate, requireRole("customer", "admin"), (req, res) => {
  const items = store.cartItems.filter((item) => item.user_id === req.user.id && item.country_id === req.countryId);
  const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
  const sourceItems = requestedItems.length ? requestedItems.map((item) => {
    const product = store.products.find((entry) => entry.id === item.product_id);
    return { product_id: product.id, merchant_id: product.merchant_id, quantity: Number(item.quantity || 1), unit_price: product.price };
  }) : items;
  if (!sourceItems.length) return res.status(400).json({ error: "Order requires at least one item" });
  const subtotal = sourceItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const deliveryFee = Number(req.body.delivery_fee || 60);
  const order = {
    id: randomUUID(),
    country_id: req.countryId,
    city_id: req.body.city_id || req.user.city_id,
    currency: req.country.currency,
    language: req.user.language,
    timezone: req.country.timezone,
    customer_user_id: req.user.id,
    merchant_id: sourceItems[0].merchant_id,
    status: "placed",
    subtotal,
    delivery_fee: deliveryFee,
    total: subtotal + deliveryFee,
    payment_method: req.body.payment_method || "cash",
    cash_on_delivery: (req.body.payment_method || "cash") === "cash",
    address_note: req.body.address_note || "Landmark required before dispatch",
    safety_mode: req.body.safety_mode || "standard",
    status_history: [{ status: "placed", actor_id: req.user.id, at: store.now() }],
    items: sourceItems,
    created_at: store.now()
  };
  store.orders.push(order);
  for (let index = store.cartItems.length - 1; index >= 0; index -= 1) {
    if (store.cartItems[index].user_id === req.user.id) store.cartItems.splice(index, 1);
  }
  res.status(201).json({ order });
});

router.get("/:id", authenticate, (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ order });
});

router.get("/customer/:customerId", authenticate, (req, res) => {
  res.json({ orders: store.orders.filter((item) => item.customer_user_id === req.params.customerId && item.country_id === req.countryId) });
});

router.patch("/:id/status", authenticate, requireRole("merchant", "driver", "admin"), (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = req.body.status;
  order.status_history.push({ status: req.body.status, reason: req.body.reason, actor_id: req.user.id, at: store.now() });
  res.json({ order });
});

router.post("/:id/cancel", authenticate, (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.status !== "placed") return res.status(409).json({ error: "Customer can cancel only before merchant accepts" });
  order.status = "cancelled";
  order.status_history.push({ status: "cancelled", actor_id: req.user.id, at: store.now() });
  res.json({ order });
});

module.exports = router;
