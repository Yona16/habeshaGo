const express = require("express");
const bcrypt = require("bcryptjs");
const Joi = require("joi");
const { randomUUID } = require("crypto");
const store = require("../database/demoStore");
const env = require("../config/env");
const { signToken, authenticate } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });

const registerSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string().min(7).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("customer", "driver", "merchant", "admin").default("customer"),
  city_id: Joi.string().default("bole"),
  language: Joi.string().default("am"),
  admin_signup_code: Joi.string().allow("", null),
  business_name: Joi.string().allow("", null),
  category: Joi.string().allow("", null),
  manager_name: Joi.string().allow("", null),
  merchant_phone: Joi.string().allow("", null),
  merchant_address: Joi.string().allow("", null),
  vehicle_type: Joi.string().allow("", null),
  vehicle_plate: Joi.string().allow("", null),
  license_number: Joi.string().allow("", null),
  assigned_zone: Joi.string().allow("", null),
  preferred_address: Joi.string().allow("", null),
  landmark_note: Joi.string().allow("", null)
});

const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim(),
  phone: Joi.string().min(7),
  password: Joi.string().min(1).required()
}).or("email", "phone");

function tokenResponse(user) {
  return {
    user: store.publicUser(user),
    token: signToken(user),
    token_type: "Bearer",
    expires_in: env.jwtExpiresIn
  };
}

function createRoleProfile(user, body, country) {
  if (user.role === "customer") {
    store.customers.push({
      id: randomUUID(),
      user_id: user.id,
      country_id: country.id,
      city_id: body.city_id,
      currency: country.currency,
      language: body.language,
      timezone: country.timezone,
      senior_mode: false,
      family_account: false,
      wallet_balance: 0,
      preferred_address: body.preferred_address || "",
      landmark_note: body.landmark_note || ""
    });
  }
  if (user.role === "driver") {
    store.drivers.push({
      id: randomUUID(),
      user_id: user.id,
      country_id: country.id,
      city_id: body.city_id,
      currency: country.currency,
      language: body.language,
      timezone: country.timezone,
      online: false,
      frozen: false,
      safety_score: 75,
      badge_level: "New Driver",
      float_balance: 0,
      cash_collected: 0,
      earnings: 0,
      vehicle_type: body.vehicle_type || "motorbike",
      vehicle_plate: body.vehicle_plate || "",
      license_number: body.license_number || "",
      assigned_zone: body.assigned_zone || body.city_id,
      verification_status: "pending"
    });
  }
  if (user.role === "merchant") {
    store.merchants.push({
      id: randomUUID(),
      owner_user_id: user.id,
      country_id: country.id,
      city_id: body.city_id,
      currency: country.currency,
      language: body.language,
      timezone: country.timezone,
      name: body.business_name || `${user.name} Store`,
      category: body.category || "restaurant",
      women_owned: false,
      verified: false,
      status: "pending",
      commission_rate: 0.12,
      address_note: body.merchant_address || "",
      manager_name: body.manager_name || user.name,
      contact_phone: body.merchant_phone || user.phone,
      verification_status: "pending"
    });
  }
}

function canCreateAdmin(body) {
  if (env.nodeEnv !== "production") return true;
  return Boolean(env.adminSignupCode && body.admin_signup_code === env.adminSignupCode);
}

async function register(req, res, next) {
  try {
    const body = await registerSchema.validateAsync(req.body, { stripUnknown: true });
    if (body.role === "admin" && !canCreateAdmin(body)) {
      return res.status(403).json({ error: "Admin signup requires ADMIN_SIGNUP_CODE in production" });
    }
    if (store.users.some((user) => user.email.toLowerCase() === body.email || user.phone === body.phone)) {
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
      password_hash: await bcrypt.hash(body.password, 12),
      language: body.language,
      currency: country.currency,
      timezone: country.timezone,
      status: "active",
      created_at: store.now()
    };
    store.users.push(user);
    createRoleProfile(user, body, country);
    store.auditLogs.push({ id: randomUUID(), actor_id: user.id, action: "auth.signup", entity_type: "user", entity_id: user.id, created_at: store.now() });
    res.status(201).json(tokenResponse(user));
  } catch (error) {
    next(error);
  }
}

router.post("/signup", register);
router.post("/register", register);

router.post("/login", async (req, res, next) => {
  try {
    const { email, phone, password } = await loginSchema.validateAsync(req.body, { stripUnknown: true });
    const user = store.users.find((item) => (email && item.email.toLowerCase() === email) || (phone && item.phone === phone));
    if (!user || user.status !== "active" || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    store.auditLogs.push({ id: randomUUID(), actor_id: user.id, action: "auth.login", entity_type: "user", entity_id: user.id, created_at: store.now() });
    res.json(tokenResponse(user));
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: store.publicUser(req.user) });
});

router.post("/logout", authenticate, (req, res) => {
  store.auditLogs.push({ id: randomUUID(), actor_id: req.user.id, action: "auth.logout", entity_type: "user", entity_id: req.user.id, created_at: store.now() });
  res.status(204).send();
});

router.post("/refresh-token", (req, res) => {
  res.status(501).json({ error: "Refresh token storage is planned for the session tracking module." });
});

module.exports = router;
