const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole("customer", "admin"));

router.get("/profile", (req, res) => {
  const customer = store.customers.find((item) => item.user_id === req.user.id);
  res.json({ user: store.publicUser(req.user), customer });
});

router.patch("/profile", (req, res) => {
  Object.assign(req.user, req.body, { id: req.user.id, role: req.user.role });
  res.json({ user: store.publicUser(req.user) });
});

router.get("/orders", (req, res) => {
  res.json({ orders: store.orders.filter((order) => order.customer_user_id === req.user.id) });
});

router.get("/wallet", (req, res) => {
  const customer = store.customers.find((item) => item.user_id === req.user.id);
  res.json({ balance: customer ? customer.wallet_balance : 0, currency: req.user.currency });
});

module.exports = router;
