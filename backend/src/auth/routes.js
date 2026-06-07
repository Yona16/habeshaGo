const express = require("express");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const { randomUUID } = require("crypto");
const store = require("../database/demoStore");
const { signToken } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(7).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("customer", "driver", "merchant").default("customer"),
  city_id: Joi.string().default("bole"),
  language: Joi.string().default("am")
});

router.post("/register", async (req, res, next) => {
  try {
    const body = await registerSchema.validateAsync(req.body);
    if (store.users.some((user) => user.email === body.email || user.phone === body.phone)) {
      return res.status(409).json({ error: "Email or phone already exists" });
    }
    const country = store.requireCountry(req.countryId);
    const user = {
      id: randomUUID(),
      country_id: country.id,
      city_id: body.city_id,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role: body.role,
      password_hash: await bcrypt.hash(body.password, 10),
      language: body.language,
      currency: country.currency,
      timezone: country.timezone,
      status: "active"
    };
    store.users.push(user);
    if (body.role === "customer") {
      store.customers.push({ id: randomUUID(), user_id: user.id, country_id: country.id, city_id: body.city_id, currency: country.currency, language: body.language, timezone: country.timezone, senior_mode: false, family_account: false, wallet_balance: 0 });
    }
    res.status(201).json({ user: store.publicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;
    const user = store.users.find((item) => (email && item.email === email) || (phone && item.phone === phone));
    if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ user: store.publicUser(user), token: signToken(user) });
  } catch (error) {
    next(error);
  }
});

router.post("/refresh-token", (req, res) => {
  res.status(501).json({ error: "Refresh token storage is planned for the session tracking module." });
});

module.exports = router;
