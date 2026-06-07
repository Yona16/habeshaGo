const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");
const store = require("../database/demoStore");

const router = express.Router({ mergeParams: true });

router.get("/available", authenticate, (req, res) => {
  res.json({ drivers: store.drivers.filter((driver) => driver.country_id === req.countryId && driver.online && !driver.frozen) });
});

router.patch("/status", authenticate, requireRole("driver", "admin"), (req, res) => {
  const driver = store.drivers.find((item) => item.user_id === req.user.id || item.id === req.body.driver_id);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  driver.online = Boolean(req.body.online);
  res.json({ driver });
});

function updateDelivery(req, res, status) {
  const driver = store.drivers.find((item) => item.id === req.params.driverId && item.country_id === req.countryId);
  const order = store.orders.find((item) => item.id === req.body.order_id && item.country_id === req.countryId);
  if (!driver || !order) return res.status(404).json({ error: "Driver or order not found" });
  order.driver_id = driver.id;
  order.status = status;
  order.status_history.push({ status, actor_id: req.user.id, at: store.now() });
  if (status === "delivered") {
    driver.earnings += Number(req.body.driver_fee || 45);
    if (order.cash_on_delivery) driver.cash_collected += order.total;
  }
  res.json({ driver, order });
}

router.post("/:driverId/accept-order", authenticate, requireRole("driver", "admin"), (req, res) => updateDelivery(req, res, "driver_accepted"));
router.post("/:driverId/reject-order", authenticate, requireRole("driver", "admin"), (req, res) => updateDelivery(req, res, "driver_rejected"));
router.post("/:driverId/picked-up", authenticate, requireRole("driver", "admin"), (req, res) => updateDelivery(req, res, "picked_up"));
router.post("/:driverId/delivered", authenticate, requireRole("driver", "admin"), (req, res) => updateDelivery(req, res, "delivered"));

router.get("/:driverId/earnings", authenticate, (req, res) => {
  const driver = store.drivers.find((item) => item.id === req.params.driverId && item.country_id === req.countryId);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json({ earnings: driver.earnings, cash_collected: driver.cash_collected, currency: driver.currency });
});

router.get("/:driverId/float-account", authenticate, (req, res) => {
  const driver = store.drivers.find((item) => item.id === req.params.driverId && item.country_id === req.countryId);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json({ float_balance: driver.float_balance, cash_collected: driver.cash_collected, currency: driver.currency });
});

module.exports = router;
