const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });
router.use(authenticate, requireRole("admin"));

router.get("/orders", (req, res) => res.json({ orders: store.orders.filter((item) => item.country_id === req.countryId) }));
router.get("/customers", (req, res) => res.json({ customers: store.customers.filter((item) => item.country_id === req.countryId) }));
router.get("/drivers", (req, res) => res.json({ drivers: store.drivers.filter((item) => item.country_id === req.countryId) }));
router.get("/merchants", (req, res) => res.json({ merchants: store.merchants.filter((item) => item.country_id === req.countryId) }));
router.get("/wallet-transactions", (req, res) => res.json({ transactions: store.walletTransactions.filter((item) => item.country_id === req.countryId) }));
router.get("/driver-float", (req, res) => res.json({ drivers: store.drivers.map((driver) => ({ id: driver.id, float_balance: driver.float_balance, cash_collected: driver.cash_collected, currency: driver.currency })) }));

router.patch("/orders/:id/status", (req, res) => {
  const order = store.orders.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = req.body.status;
  order.status_history.push({ status: req.body.status, reason: req.body.reason || "admin_override", actor_id: req.user.id, at: store.now() });
  store.auditLogs.push({ id: randomUUID(), actor_id: req.user.id, action: "admin.order.override", entity_type: "order", entity_id: order.id, created_at: store.now() });
  res.json({ order });
});

router.patch("/drivers/:id/freeze", (req, res) => {
  const driver = store.drivers.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  driver.frozen = req.body.frozen !== false;
  res.json({ driver });
});

router.patch("/merchants/:id/status", (req, res) => {
  const merchant = store.merchants.find((item) => item.id === req.params.id && item.country_id === req.countryId);
  if (!merchant) return res.status(404).json({ error: "Merchant not found" });
  merchant.status = req.body.status;
  res.json({ merchant });
});

router.get("/reports", (req, res) => {
  const countryOrders = store.orders.filter((item) => item.country_id === req.countryId);
  res.json({
    orders_completed: countryOrders.filter((order) => order.status === "delivered").length,
    gross_value: countryOrders.reduce((sum, order) => sum + order.total, 0),
    active_merchants: store.merchants.filter((merchant) => merchant.country_id === req.countryId && merchant.status === "open").length,
    unresolved_cash_reconciliation: store.drivers.filter((driver) => driver.cash_collected > driver.float_balance).length,
    pilot_targets: { first_week_orders: 100, average_delivery_minutes: 45, minimum_customer_rating: 4.2 }
  });
});

module.exports = router;
