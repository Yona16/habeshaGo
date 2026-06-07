const express = require("express");
const { randomUUID } = require("crypto");

const items = [];
const router = express.Router({ mergeParams: true });

router.post("/items", (req, res) => {
  const item = {
    id: randomUUID(),
    module: "Kelemat zero-inventory hyperlocal marketplace",
    country_id: req.countryId,
    city_id: req.body.city_id,
    seller_type: req.body.seller_type || "home_cook",
    name: req.body.name,
    quantity: Number(req.body.quantity || 1),
    radius_km: Number(req.body.radius_km || 3),
    verification_status: "pending"
  };
  items.push(item);
  res.status(201).json({ item });
});

module.exports = router;
