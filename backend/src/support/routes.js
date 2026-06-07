const express = require("express");
const { randomUUID } = require("crypto");
const { authenticate } = require("../middleware/auth");

const tickets = [];
const router = express.Router({ mergeParams: true });

router.post("/tickets", authenticate, (req, res) => {
  const ticket = {
    id: randomUUID(),
    user_id: req.user.id,
    country_id: req.countryId,
    city_id: req.user.city_id,
    currency: req.user.currency,
    language: req.user.language,
    timezone: req.user.timezone,
    subject: req.body.subject,
    priority: req.body.priority || "normal",
    status: "open"
  };
  tickets.push(ticket);
  res.status(201).json({ ticket });
});

module.exports = router;
