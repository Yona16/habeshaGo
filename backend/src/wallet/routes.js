const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.use(authenticate);

router.get("/", (req, res) => {
  const customer = store.customers.find((item) => item.user_id === req.user.id);
  res.json({ balance: customer ? customer.wallet_balance : 0, currency: req.user.currency, immutable_ledger: true });
});

router.get("/transactions", (req, res) => {
  res.json({ transactions: store.walletTransactions.filter((tx) => tx.user_id === req.user.id || req.user.role === "admin") });
});

router.post("/admin-adjustment", requireRole("admin"), (req, res) => {
  const target = store.customers.find((item) => item.user_id === req.body.user_id);
  if (!target) return res.status(404).json({ error: "Customer wallet not found" });
  const amount = Number(req.body.amount);
  target.wallet_balance += amount;
  const transaction = store.createWalletTransaction({ user_id: req.body.user_id, country_id: req.countryId, city_id: target.city_id, currency: target.currency, amount, type: "admin_adjustment", reason: req.body.reason, actor_id: req.user.id });
  res.status(201).json({ transaction, balance: target.wallet_balance });
});

module.exports = router;
