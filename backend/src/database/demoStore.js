const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");

const now = () => new Date().toISOString();

const countries = [
  { id: "ET", name: "Ethiopia", currency: "ETB", timezone: "Africa/Addis_Ababa", languages: ["am", "en", "om", "ti"], payments: ["Telebirr", "Chapa", "Cash"] },
  { id: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi", languages: ["en", "sw"], payments: ["M-Pesa", "Airtel Money", "Card", "Cash"] },
  { id: "TZ", name: "Tanzania", currency: "TZS", timezone: "Africa/Dar_es_Salaam", languages: ["sw", "en"], payments: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
  { id: "UG", name: "Uganda", currency: "UGX", timezone: "Africa/Kampala", languages: ["en", "lg", "sw"], payments: ["MTN MoMo", "Airtel Money"] },
  { id: "RW", name: "Rwanda", currency: "RWF", timezone: "Africa/Kigali", languages: ["rw", "en", "fr"], payments: ["MoMo", "Airtel Money", "Card"] },
  { id: "SS", name: "South Sudan", currency: "SSP", timezone: "Africa/Juba", languages: ["en", "ar", "jub"], payments: ["MTN MoMo", "Zain Cash", "Cash"] }
];

const cities = [
  { id: "addis-ababa", country_id: "ET", name: "Addis Ababa", launch_phase: 1, active: true },
  { id: "bole", country_id: "ET", name: "Bole", launch_phase: 1, active: true },
  { id: "adama", country_id: "ET", name: "Adama", launch_phase: 2, active: false },
  { id: "bahir-dar", country_id: "ET", name: "Bahir Dar", launch_phase: 2, active: false },
  { id: "hawassa", country_id: "ET", name: "Hawassa", launch_phase: 2, active: false },
  { id: "dire-dawa", country_id: "ET", name: "Dire Dawa", launch_phase: 2, active: false },
  { id: "mekelle", country_id: "ET", name: "Mekelle", launch_phase: 2, active: false },
  { id: "gondar", country_id: "ET", name: "Gondar", launch_phase: 2, active: false },
  { id: "nairobi", country_id: "KE", name: "Nairobi", launch_phase: 3, active: false },
  { id: "dar-es-salaam", country_id: "TZ", name: "Dar es Salaam", launch_phase: 3, active: false },
  { id: "kampala", country_id: "UG", name: "Kampala", launch_phase: 3, active: false },
  { id: "kigali", country_id: "RW", name: "Kigali", launch_phase: 3, active: false },
  { id: "juba", country_id: "SS", name: "Juba", launch_phase: 3, active: false }
];

const users = [
  { id: "admin-1", country_id: "ET", city_id: "addis-ababa", name: "HabeshaGo Admin", email: "admin@habeshago.local", phone: "+251900000001", role: "admin", password_hash: bcrypt.hashSync("Admin123!", 10), language: "en", currency: "ETB", timezone: "Africa/Addis_Ababa", status: "active" },
  { id: "customer-1", country_id: "ET", city_id: "bole", name: "Demo Customer", email: "customer@habeshago.local", phone: "+251900000002", role: "customer", password_hash: bcrypt.hashSync("Customer123!", 10), language: "am", currency: "ETB", timezone: "Africa/Addis_Ababa", status: "active" },
  { id: "driver-1", country_id: "ET", city_id: "bole", name: "Demo Driver", email: "driver@habeshago.local", phone: "+251900000003", role: "driver", password_hash: bcrypt.hashSync("Driver123!", 10), language: "am", currency: "ETB", timezone: "Africa/Addis_Ababa", status: "active" },
  { id: "merchant-user-1", country_id: "ET", city_id: "bole", name: "Demo Merchant", email: "merchant@habeshago.local", phone: "+251900000004", role: "merchant", password_hash: bcrypt.hashSync("Merchant123!", 10), language: "am", currency: "ETB", timezone: "Africa/Addis_Ababa", status: "active" }
];

const merchants = [
  { id: "merchant-1", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Addis Chefs", category: "restaurant", women_owned: true, verified: true, status: "open", commission_rate: 0.12, address_note: "Near Medhanealem Church, blue gate" },
  { id: "merchant-2", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Bole Fresh Grocery", category: "grocery", women_owned: false, verified: true, status: "open", commission_rate: 0.08, address_note: "Friendship area" }
];

const products = [
  { id: "product-1", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Kitfo", category: "food", price: 350, available: true },
  { id: "product-2", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Shiro", category: "food", price: 220, available: true },
  { id: "product-3", merchant_id: "merchant-2", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Fresh Injera Pack", category: "grocery", price: 120, available: true }
];

const drivers = [
  { id: "driver-1", user_id: "driver-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", online: true, frozen: false, safety_score: 98, badge_level: "Bole Starter", float_balance: 1200, cash_collected: 0, earnings: 0 }
];

const customers = [
  { id: "customer-1", user_id: "customer-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", senior_mode: false, family_account: true, wallet_balance: 500 }
];

const orders = [];
const cartItems = [];
const walletTransactions = [];
const auditLogs = [];

const flags = [
  "DRIVER_AGENT_ENABLED",
  "MERCHANT_ADVANCE_ENABLED",
  "DIASPORA_FUNDING_ENABLED",
  "CROSS_BORDER_WALLET_ENABLED",
  "SOCIAL_FEED_ENABLED",
  "VOICE_ORDERING_ENABLED",
  "NIGHT_SAFETY_ENABLED",
  "CHILD_DELIVERY_ENABLED"
].map((key) => ({ key, enabled: false, scope: "global", legal_hold: true }));

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function countryContext(countryId) {
  const country = countries.find((item) => item.id.toLowerCase() === String(countryId).toLowerCase());
  if (!country) return null;
  return country;
}

function requireCountry(countryId) {
  const country = countryContext(countryId);
  if (!country) {
    const error = new Error("Unsupported country");
    error.status = 404;
    throw error;
  }
  return country;
}

function createWalletTransaction({ user_id, country_id, city_id, currency, amount, type, reason, actor_id }) {
  const tx = {
    id: randomUUID(),
    user_id,
    country_id,
    city_id,
    currency,
    amount: Number(amount),
    type,
    reason,
    actor_id,
    immutable: true,
    created_at: now()
  };
  walletTransactions.push(tx);
  auditLogs.push({ id: randomUUID(), actor_id, action: "wallet.transaction.created", entity_type: "wallet_transaction", entity_id: tx.id, created_at: now() });
  return tx;
}

module.exports = {
  countries,
  cities,
  users,
  customers,
  merchants,
  products,
  drivers,
  orders,
  cartItems,
  walletTransactions,
  auditLogs,
  flags,
  now,
  publicUser,
  requireCountry,
  createWalletTransaction
};
