const http = require("http");
const fs = require("fs");
const path = require("path");
const { randomUUID, pbkdf2Sync, timingSafeEqual } = require("crypto");

const port = Number(process.env.PORT || 3000);
const rootDir = path.resolve(__dirname, "..", "..");
const webDir = path.resolve(rootDir, "web", "app");
const dataFile = path.resolve(__dirname, "..", "data", "local-store.json");

const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const HQ_COORDS = { lat: 8.994, lng: 38.789 };
const ORDER_TRANSITIONS = {
  placed: ["accepted", "cancelled", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup"],
  ready_for_pickup: ["driver_requested", "driver_accepted", "picked_up"],
  driver_requested: ["driver_accepted", "cancelled"],
  driver_accepted: ["picked_up"],
  picked_up: ["delivered"],
  delivered: [],
  cancelled: [],
  rejected: []
};

function hashPassword(password, salt = randomUUID()) {
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function seedData() {
  const countries = [
    { id: "ET", name: "Ethiopia", currency: "ETB", timezone: "Africa/Addis_Ababa", languages: ["am", "en", "om", "ti"], payments: ["Telebirr", "Chapa", "Cash"] },
    { id: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi", languages: ["en", "sw"], payments: ["M-Pesa", "Airtel Money", "Card", "Cash"] },
    { id: "TZ", name: "Tanzania", currency: "TZS", timezone: "Africa/Dar_es_Salaam", languages: ["sw", "en"], payments: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
    { id: "UG", name: "Uganda", currency: "UGX", timezone: "Africa/Kampala", languages: ["en", "lg", "sw"], payments: ["MTN MoMo", "Airtel Money"] },
    { id: "RW", name: "Rwanda", currency: "RWF", timezone: "Africa/Kigali", languages: ["rw", "en", "fr"], payments: ["MoMo", "Airtel Money", "Card"] },
    { id: "SS", name: "South Sudan", currency: "SSP", timezone: "Africa/Juba", languages: ["en", "ar", "jub"], payments: ["MTN MoMo", "Zain Cash", "Cash"] }
  ];

  return {
    schemaVersion: 2,
    countries,
    cities: [
      { id: "bole", country_id: "ET", name: "Bole", launch_phase: 1, active: true },
      { id: "addis-ababa", country_id: "ET", name: "Addis Ababa", launch_phase: 1, active: true },
      { id: "adama", country_id: "ET", name: "Adama", launch_phase: 2, active: false },
      { id: "bahir-dar", country_id: "ET", name: "Bahir Dar", launch_phase: 2, active: false },
      { id: "hawassa", country_id: "ET", name: "Hawassa", launch_phase: 2, active: false },
      { id: "nairobi", country_id: "KE", name: "Nairobi", launch_phase: 3, active: false },
      { id: "dar-es-salaam", country_id: "TZ", name: "Dar es Salaam", launch_phase: 3, active: false },
      { id: "kampala", country_id: "UG", name: "Kampala", launch_phase: 3, active: false },
      { id: "kigali", country_id: "RW", name: "Kigali", launch_phase: 3, active: false },
      { id: "juba", country_id: "SS", name: "Juba", launch_phase: 3, active: false }
    ],
    users: [
      { id: "admin-1", name: "HabeshaGo Admin", email: "admin@habeshago.local", phone: "+251900000001", role: "admin", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", password_hash: hashPassword("Admin123!"), status: "active" },
      { id: "customer-1", name: "Demo Customer", email: "customer@habeshago.local", phone: "+251900000002", role: "customer", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", password_hash: hashPassword("Customer123!"), status: "active" },
      { id: "merchant-user-1", name: "Demo Merchant", email: "merchant@habeshago.local", phone: "+251900000003", role: "merchant", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", password_hash: hashPassword("Merchant123!"), status: "active" },
      { id: "driver-user-1", name: "Demo Driver", email: "driver@habeshago.local", phone: "+251900000004", role: "driver", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", password_hash: hashPassword("Driver123!"), status: "active" }
    ],
    customers: [
      {
        id: "customer-1",
        user_id: "customer-1",
        country_id: "ET",
        city_id: "bole",
        currency: "ETB",
        language: "am",
        timezone: "Africa/Addis_Ababa",
        wallet_balance: 500,
        senior_mode: false,
        family_account: true,
        preferred_address: "Blue gate next to Medhanealem Church, Bole",
        landmark_note: "Near church, call before arrival",
        emergency_contact_name: "Family Contact",
        emergency_contact_phone: "+251900000099",
        support_preference: "phone"
      }
    ],
    merchants: [
      { id: "merchant-1", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Addis Chefs", category: "restaurant", women_owned: true, verified: true, status: "open", commission_rate: 0.12, rating: 4.7, review_count: 128, latitude: 8.996, longitude: 38.787, address_note: "Blue gate next to Medhanealem Church", contact_phone: "+251911111111", manager_name: "Mimi Alemu", opening_hours: "Mon-Sun 8:00 AM - 10:00 PM", prep_time_minutes: 18, delivery_radius_km: 4, payout_schedule: "weekly", trust_score: 92, verification_status: "verified", support_notes: "High demand lunch merchant. Confirm kitfo spice level before dispatch." },
      { id: "merchant-2", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Bole Fresh Grocery", category: "grocery", women_owned: false, verified: true, status: "open", commission_rate: 0.08, rating: 4.5, review_count: 86, latitude: 8.991, longitude: 38.792, address_note: "Friendship area", contact_phone: "+251922222222", manager_name: "Dawit Bekele", opening_hours: "Mon-Sat 7:00 AM - 9:00 PM", prep_time_minutes: 12, delivery_radius_km: 3, payout_schedule: "weekly", trust_score: 89, verification_status: "verified", support_notes: "Grocery substitutions allowed after customer confirmation." },
      { id: "merchant-3", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Almaz Injera House", category: "marketplace", women_owned: true, verified: false, status: "open", commission_rate: 0.07, rating: 4.4, review_count: 42, latitude: 8.999, longitude: 38.782, address_note: "Woreda 03, yellow door near school", contact_phone: "+251933333333", manager_name: "Almaz Tesfaye", opening_hours: "Mon-Fri 6:00 AM - 7:00 PM", prep_time_minutes: 25, delivery_radius_km: 2, payout_schedule: "weekly", trust_score: 81, verification_status: "pending", support_notes: "Home-based seller; verify quantity before accepting bulk orders." },
      { id: "merchant-4", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Bole Buna Cafe", category: "cafe", women_owned: false, verified: true, status: "open", commission_rate: 0.1, rating: 4.8, review_count: 212, latitude: 8.995, longitude: 38.790, address_note: "Across from Edna Mall", contact_phone: "+251944444444", manager_name: "Sara Coffee", opening_hours: "Mon-Sun 6:30 AM - 11:00 PM", prep_time_minutes: 9, delivery_radius_km: 3, payout_schedule: "weekly", trust_score: 94, verification_status: "verified", support_notes: "Popular coffee and pastry spot near Bole." },
      { id: "merchant-5", owner_user_id: "merchant-user-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Bole Supermarket Express", category: "supermarket", women_owned: false, verified: true, status: "open", commission_rate: 0.08, rating: 4.6, review_count: 167, latitude: 8.990, longitude: 38.785, address_note: "Near airport road", contact_phone: "+251955555555", manager_name: "Hana Market", opening_hours: "Mon-Sun 7:00 AM - 12:00 AM", prep_time_minutes: 11, delivery_radius_km: 5, payout_schedule: "weekly", trust_score: 90, verification_status: "verified", support_notes: "Good for household staples and fast grocery baskets." }
    ],
    products: [
      { id: "product-1", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Kitfo", category: "food", price: 350, available: true, description: "Minced lean beef with mitmita, ayib, and kocho.", prep_time_minutes: 18, dietary_tags: ["spicy", "beef"], stock_quantity: 24, popular: true },
      { id: "product-2", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Shiro", category: "food", price: 220, available: true, description: "Slow-cooked chickpea stew with injera.", prep_time_minutes: 14, dietary_tags: ["vegetarian"], stock_quantity: 30, popular: true },
      { id: "product-3", merchant_id: "merchant-2", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Fresh Injera Pack", category: "grocery", price: 120, available: true, description: "Pack of fresh injera for family meals.", prep_time_minutes: 6, dietary_tags: ["teff"], stock_quantity: 60, popular: false },
      { id: "product-4", merchant_id: "merchant-2", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Family Vegetable Box", category: "grocery", price: 480, available: true, description: "Tomato, onion, potato, carrot, and greens.", prep_time_minutes: 10, dietary_tags: ["family", "fresh"], stock_quantity: 15, popular: true },
      { id: "product-5", merchant_id: "merchant-3", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Teff Injera Bundle", category: "marketplace", price: 180, available: true, description: "Home-made teff injera bundle from verified home seller.", prep_time_minutes: 25, dietary_tags: ["home-made", "teff"], stock_quantity: 12, popular: false },
      { id: "product-6", merchant_id: "merchant-4", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Macchiato and Croissant", category: "cafe", price: 190, available: true, description: "Fresh macchiato with butter croissant.", prep_time_minutes: 9, dietary_tags: ["coffee", "pastry"], stock_quantity: 40, popular: true },
      { id: "product-7", merchant_id: "merchant-5", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Supermarket Essentials Pack", category: "supermarket", price: 650, available: true, description: "Milk, bread, eggs, water, and cleaning basics.", prep_time_minutes: 11, dietary_tags: ["household", "grocery"], stock_quantity: 25, popular: true }
    ],
    drivers: [
      {
        id: "driver-1",
        user_id: "driver-user-1",
        country_id: "ET",
        city_id: "bole",
        currency: "ETB",
        language: "am",
        timezone: "Africa/Addis_Ababa",
        online: true,
        frozen: false,
        safety_score: 98,
        badge_level: "Bole Starter",
        float_balance: 1200,
        cash_collected: 0,
        earnings: 0,
        latitude: 8.993,
        longitude: 38.788,
        vehicle_type: "motorbike",
        vehicle_plate: "AA-2-34567",
        license_number: "ET-DRV-001",
        assigned_zone: "Bole",
        emergency_contact_name: "Driver Family",
        emergency_contact_phone: "+251900000088",
        verification_status: "verified",
        training_status: "night_safety_pending"
      }
    ],
    carts: [],
    orders: [],
    dispatch_requests: [],
    menu_requests: [],
    notifications: [],
    trust_verifications: [
      { id: "trust-merchant-1", entity_type: "merchant", entity_id: "merchant-1", status: "verified", score: 92, note: "Business phone and address confirmed." },
      { id: "trust-driver-1", entity_type: "driver", entity_id: "driver-1", status: "verified", score: 98, note: "License and safety training checked." },
      { id: "trust-address-1", entity_type: "address", entity_id: "customer-1", status: "verified", score: 86, note: "Landmark confirmed near Medhanealem Church." }
    ],
    wallet_transactions: [],
    payment_transactions: [],
    sms_messages: [],
    map_quotes: [],
    compliance_reviews: [
      { id: "compliance-wallet", area: "Wallet ledger", status: "technical_foundation_only", legal_hold: false, note: "Wallet ledger demo is allowed locally; production needs financial counsel review." },
      { id: "compliance-driver-float", area: "Driver float and cash reconciliation", status: "pilot_controls_required", legal_hold: false, note: "Daily reconciliation, audit logs, and finance owner approval required." },
      { id: "compliance-merchant-advance", area: "Merchant advance", status: "blocked", legal_hold: true, note: "Do not enable without lending/legal approval." },
      { id: "compliance-diaspora-funding", area: "Diaspora funding", status: "blocked", legal_hold: true, note: "Do not enable without securities/payments legal review." },
      { id: "compliance-cross-border", area: "Cross-border wallet", status: "blocked", legal_hold: true, note: "Do not enable without remittance licensing review." },
      { id: "compliance-child-delivery", area: "Child delivery", status: "safety_design_required", legal_hold: false, note: "Use PIN and guardian notification; avoid unnecessary child photo storage." }
    ],
    support_tickets: [],
    audit_logs: [],
    feature_flags: [
      { key: "DRIVER_AGENT_ENABLED", enabled: false, legal_hold: true },
      { key: "MERCHANT_ADVANCE_ENABLED", enabled: false, legal_hold: true },
      { key: "DIASPORA_FUNDING_ENABLED", enabled: false, legal_hold: true },
      { key: "CROSS_BORDER_WALLET_ENABLED", enabled: false, legal_hold: true },
      { key: "SOCIAL_FEED_ENABLED", enabled: false, legal_hold: false },
      { key: "VOICE_ORDERING_ENABLED", enabled: false, legal_hold: false },
      { key: "NIGHT_SAFETY_ENABLED", enabled: false, legal_hold: false },
      { key: "CHILD_DELIVERY_ENABLED", enabled: false, legal_hold: false }
    ],
    sessions: {}
  };
}

function loadStore() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  if (!fs.existsSync(dataFile)) {
    const seeded = seedData();
    fs.writeFileSync(dataFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  const parsed = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  if (parsed.schemaVersion !== 2) {
    const seeded = seedData();
    seeded.orders = parsed.orders || [];
    seeded.dispatch_requests = parsed.dispatch_requests || [];
    seeded.menu_requests = parsed.menu_requests || [];
    seeded.notifications = parsed.notifications || [];
    seeded.wallet_transactions = parsed.wallet_transactions || [];
    seeded.payment_transactions = parsed.payment_transactions || [];
    seeded.sms_messages = parsed.sms_messages || [];
    seeded.map_quotes = parsed.map_quotes || [];
    seeded.support_tickets = parsed.support_tickets || [];
    seeded.audit_logs = parsed.audit_logs || [];
    seeded.trust_verifications = parsed.trust_verifications || seedData().trust_verifications;
    fs.writeFileSync(dataFile, JSON.stringify(seeded, null, 2));
    return seeded;
  }
  parsed.sessions = parsed.sessions || {};
  parsed.payment_transactions = parsed.payment_transactions || [];
  parsed.dispatch_requests = parsed.dispatch_requests || [];
  parsed.menu_requests = parsed.menu_requests || [];
  parsed.notifications = parsed.notifications || [];
  parsed.sms_messages = parsed.sms_messages || [];
  parsed.map_quotes = parsed.map_quotes || [];
  parsed.compliance_reviews = parsed.compliance_reviews || seedData().compliance_reviews;
  parsed.support_tickets = parsed.support_tickets || [];
  parsed.audit_logs = parsed.audit_logs || [];
  parsed.trust_verifications = parsed.trust_verifications || seedData().trust_verifications;
  normalizeDetails(parsed);
  return parsed;
}

function normalizeDetails(data) {
  const seeded = seedData();
  for (const merchant of seeded.merchants) {
    if (!data.merchants.some((item) => item.id === merchant.id)) data.merchants.push(merchant);
  }
  for (const product of seeded.products) {
    if (!data.products.some((item) => item.id === product.id)) data.products.push(product);
  }
  for (const merchant of data.merchants || []) {
    const fallback = seeded.merchants.find((item) => item.id === merchant.id) || {};
    merchant.contact_phone = merchant.contact_phone || fallback.contact_phone || "";
    merchant.manager_name = merchant.manager_name || fallback.manager_name || "Store Manager";
    merchant.opening_hours = merchant.opening_hours || fallback.opening_hours || "Hours not set";
    merchant.prep_time_minutes = merchant.prep_time_minutes || fallback.prep_time_minutes || 20;
    merchant.delivery_radius_km = merchant.delivery_radius_km || fallback.delivery_radius_km || 3;
    merchant.payout_schedule = merchant.payout_schedule || fallback.payout_schedule || "weekly";
    merchant.trust_score = merchant.trust_score || fallback.trust_score || 75;
    merchant.verification_status = merchant.verification_status || fallback.verification_status || (merchant.verified ? "verified" : "pending");
    merchant.support_notes = merchant.support_notes || fallback.support_notes || "No support notes yet.";
    merchant.review_count = merchant.review_count ?? fallback.review_count ?? 0;
    merchant.latitude = merchant.latitude ?? fallback.latitude ?? 8.994;
    merchant.longitude = merchant.longitude ?? fallback.longitude ?? 38.789;
  }
  for (const product of data.products || []) {
    const fallback = seeded.products.find((item) => item.id === product.id) || {};
    product.description = product.description || fallback.description || `${product.name} from a local merchant.`;
    product.prep_time_minutes = product.prep_time_minutes || fallback.prep_time_minutes || 15;
    product.dietary_tags = product.dietary_tags || fallback.dietary_tags || [];
    product.stock_quantity = product.stock_quantity ?? fallback.stock_quantity ?? 10;
    product.popular = product.popular ?? fallback.popular ?? false;
  }
  for (const driver of data.drivers || []) {
    const fallback = seeded.drivers.find((item) => item.id === driver.id) || {};
    driver.latitude = driver.latitude ?? fallback.latitude ?? 8.993;
    driver.longitude = driver.longitude ?? fallback.longitude ?? 38.788;
    driver.assigned_zone = driver.assigned_zone || fallback.assigned_zone || "Bole";
    driver.vehicle_type = driver.vehicle_type || fallback.vehicle_type || "motorbike";
    driver.vehicle_plate = driver.vehicle_plate || fallback.vehicle_plate || "";
  }
}

let store = loadStore();
const eventClients = new Set();

function saveStore() {
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
}

function broadcast(type, payload) {
  const event = { type, payload, at: new Date().toISOString() };
  const encoded = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;
  for (const res of eventClients) {
    try {
      res.write(encoded);
    } catch {
      eventClients.delete(res);
    }
  }
}

function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function countryFromPath(pathname) {
  const match = pathname.match(/^\/api\/([^/]+)\/v1/);
  return match ? match[1].toUpperCase() : "ET";
}

function send(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers": "Content-Type,Authorization",
    "x-content-type-options": "nosniff",
    ...headers
  });
  res.end(JSON.stringify(payload, null, 2));
}

function sendError(res, status, message, details) {
  send(res, status, { error: message, details });
}

function enrichOrder(order) {
  const merchant = store.merchants.find((item) => item.id === order.merchant_id);
  const driver = store.drivers.find((item) => item.id === order.driver_id);
  const driverUser = driver ? store.users.find((item) => item.id === driver.user_id) : null;
  const customerUser = store.users.find((item) => item.id === order.customer_user_id);
  const payments = store.payment_transactions.filter((item) => item.order_id === order.id);
  const sms = store.sms_messages.filter((item) => item.order_id === order.id);
  const dispatch = store.dispatch_requests.find((item) => item.order_id === order.id) || null;
  return {
    ...order,
    merchant_name: merchant ? merchant.name : "Unknown merchant",
    merchant_phone: merchant ? merchant.contact_phone : "",
    customer_name: customerUser ? customerUser.name : "",
    customer_phone: customerUser ? customerUser.phone : "",
    driver_name: driverUser ? driverUser.name : "",
    driver_phone: driverUser ? driverUser.phone : "",
    driver_vehicle: driver ? `${driver.vehicle_type || ""} ${driver.vehicle_plate || ""}`.trim() : "",
    payment_detail: payments[payments.length - 1] || null,
    sms_count: sms.length,
    dispatch_request: dispatch
  };
}

function recommendationsFor(user, countryId) {
  const orders = store.orders.filter((order) => order.country_id === countryId);
  const openOrders = orders.filter((order) => !["delivered", "cancelled", "rejected"].includes(order.status));
  const popularProducts = store.products.filter((product) => product.country_id === countryId && product.popular);
  const womenOwned = store.merchants.filter((merchant) => merchant.country_id === countryId && merchant.women_owned);
  const pendingDispatch = store.dispatch_requests.filter((request) => request.country_id === countryId && request.status === "requested");
  const legalHolds = store.compliance_reviews.filter((review) => review.legal_hold);
  const base = [
    { title: "Keep legal holds on", detail: `${legalHolds.length} regulated features are blocked until legal approval.`, priority: "high", area: "compliance" },
    { title: "Test offline fallback", detail: "Run at least 10 offline/SMS fallback order tests before pilot launch.", priority: "medium", area: "operations" },
    { title: "Verify Bole addresses", detail: "Use landmark notes and trust verification before dispatching hard-to-find deliveries.", priority: "medium", area: "trust" }
  ];
  if (!user) {
    return [
      { title: "Create a test account", detail: "Signup as customer, merchant, driver, or admin to test each workflow.", priority: "high", area: "onboarding" },
      ...base
    ];
  }
  if (user.role === "customer") {
    return [
      { title: "Try a popular dish", detail: popularProducts.length ? `${popularProducts[0].name} is popular near Bole.` : "Browse popular products near Bole.", priority: "medium", area: "customer" },
      { title: "Use landmark address", detail: "Add gate color, nearby church/school/bank, and phone notes for faster delivery.", priority: "high", area: "address" },
      { title: "Support Almaz merchants", detail: womenOwned.length ? `${womenOwned[0].name} is women-owned and available now.` : "Filter for women-owned merchants when available.", priority: "low", area: "almaz" }
    ];
  }
  if (user.role === "merchant") {
    return [
      { title: "Request driver when ready", detail: `${openOrders.filter((order) => order.status === "ready_for_pickup").length} orders may be ready for dispatch.`, priority: "high", area: "merchant" },
      { title: "Confirm menu details", detail: "Keep stock, prep time, dietary tags, and substitutions current.", priority: "medium", area: "menu" },
      { title: "Improve trust score", detail: "Keep phone, manager, hours, and location verification up to date.", priority: "medium", area: "trust" }
    ];
  }
  if (user.role === "driver") {
    return [
      { title: "Accept nearby requests", detail: `${pendingDispatch.length} driver requests are waiting.`, priority: pendingDispatch.length ? "high" : "low", area: "driver" },
      { title: "Protect cash balance", detail: "Reconcile cash collected daily against driver float.", priority: "high", area: "cash" },
      { title: "Finish night safety training", detail: "Night certification unlocks future Mesewa delivery flows.", priority: "medium", area: "safety" }
    ];
  }
  return [
    { title: "Pilot readiness", detail: `${orders.length} local orders recorded. Target 100 completed orders in week one.`, priority: "high", area: "admin" },
    { title: "Watch dispatch queue", detail: `${pendingDispatch.length} driver requests are currently waiting.`, priority: pendingDispatch.length ? "high" : "medium", area: "dispatch" },
    { title: "Audit simulated payments", detail: `${store.payment_transactions.length} dummy payment records exist. Confirm no real money movement.`, priority: "high", area: "payments" },
    { title: "Resolve support queue", detail: `${store.support_tickets.filter((ticket) => ticket.status === "open").length} support tickets are open.`, priority: "medium", area: "support" },
    ...base
  ];
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function userFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const session = store.sessions[token];
  if (!session || session.expires_at < Date.now()) return null;
  const user = store.users.find((item) => item.id === session.user_id && item.status === "active");
  return user || null;
}

function requireUser(req, res, roles = []) {
  const user = userFromRequest(req);
  if (!user) {
    sendError(res, 401, "Authentication required");
    return null;
  }
  if (roles.length && !roles.includes(user.role)) {
    sendError(res, 403, "Insufficient permissions", { required: roles, current: user.role });
    return null;
  }
  return user;
}

function audit(actor, action, entity_type, entity_id, metadata = {}) {
  store.audit_logs.push({
    id: randomUUID(),
    actor_user_id: actor ? actor.id : null,
    country_id: actor ? actor.country_id : null,
    city_id: actor ? actor.city_id : null,
    currency: actor ? actor.currency : null,
    language: actor ? actor.language : null,
    timezone: actor ? actor.timezone : null,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at: new Date().toISOString()
  });
}

function getCart(userId, countryId) {
  let cart = store.carts.find((item) => item.user_id === userId && item.country_id === countryId);
  if (!cart) {
    cart = { id: randomUUID(), user_id: userId, country_id: countryId, items: [] };
    store.carts.push(cart);
  }
  return cart;
}

function calculateItems(items, countryId) {
  return items.map((item) => {
    const product = store.products.find((entry) => entry.id === item.product_id && entry.country_id === countryId && entry.available);
    if (!product) {
      const error = new Error(`Product ${item.product_id} is not available`);
      error.status = 404;
      throw error;
    }
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      id: randomUUID(),
      product_id: product.id,
      merchant_id: product.merchant_id,
      name: product.name,
      quantity,
      unit_price: product.price,
      line_total: quantity * product.price,
      currency: product.currency
    };
  });
}

function distanceKm(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function quoteDelivery(destination = {}) {
  const dest = {
    lat: Number(destination.lat || 8.997),
    lng: Number(destination.lng || 38.786)
  };
  const distance = distanceKm(HQ_COORDS, dest);
  const eta = Math.max(12, Math.round(10 + distance * 7));
  const fee = Math.max(45, Math.round(35 + distance * 18));
  return { origin: HQ_COORDS, destination: dest, distance_km: Number(distance.toFixed(2)), eta_minutes: eta, fee };
}

function logSms({ to, template, body, country_id, user_id, order_id }) {
  const message = {
    id: randomUUID(),
    to,
    template,
    body,
    country_id,
    user_id,
    order_id,
    provider: "SIMULATED_SMS",
    status: "logged_not_sent",
    created_at: new Date().toISOString()
  };
  store.sms_messages.push(message);
  return message;
}

function notifyUser({ user_id, country_id, title, body, order_id, type = "info" }) {
  const notification = {
    id: randomUUID(),
    user_id,
    country_id,
    title,
    body,
    order_id,
    type,
    read: false,
    created_at: new Date().toISOString()
  };
  store.notifications.push(notification);
  broadcast("notification.created", notification);
  return notification;
}

function transitionOrder(order, nextStatus, actor, reason) {
  const allowed = ORDER_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus) && actor.role !== "admin") {
    const error = new Error(`Cannot move order from ${order.status} to ${nextStatus}`);
    error.status = 409;
    throw error;
  }
  order.status = nextStatus;
  order.status_history.push({ status: nextStatus, reason, actor_user_id: actor.id, at: new Date().toISOString() });
  audit(actor, "order.status_changed", "order", order.id, { status: nextStatus, reason });
  broadcast("order.updated", { order_id: order.id, status: nextStatus, actor_role: actor.role });
  if (nextStatus === "ready_for_pickup") {
    notifyUser({
      user_id: order.customer_user_id,
      country_id: order.country_id,
      order_id: order.id,
      type: "food_ready",
      title: "Food is ready",
      body: `Your order ${order.id.slice(0, 8)} is ready and waiting for driver pickup.`
    });
  }
  if (nextStatus === "delivered") {
    notifyUser({
      user_id: order.customer_user_id,
      country_id: order.country_id,
      order_id: order.id,
      type: "delivered",
      title: "Order delivered",
      body: `Your order ${order.id.slice(0, 8)} has been delivered.`
    });
  }
}

function serveStatic(req, res, pathname) {
  const routePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(webDir, `.${routePath}`);
  if (!filePath.startsWith(webDir)) return false;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return false;
  const ext = path.extname(filePath);
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8" };
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream", "x-content-type-options": "nosniff" });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleApi(req, res, url) {
  const countryId = countryFromPath(url.pathname);
  const country = store.countries.find((item) => item.id === countryId);
  if (!country && url.pathname !== "/api/v1/countries") return sendError(res, 404, "Unsupported country");

  if (req.method === "GET" && url.pathname.endsWith("/events")) {
    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*"
    });
    res.write(`event: connected\ndata: ${JSON.stringify({ type: "connected", at: new Date().toISOString() })}\n\n`);
    eventClients.add(res);
    req.on("close", () => eventClients.delete(res));
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      status: "ok",
      service: "HabeshaGo local production-readiness MVP",
      persistence: path.relative(rootDir, dataFile),
      countries: store.countries.length,
      orders: store.orders.length
    });
  }

  if (req.method === "GET" && url.pathname === "/api/v1/countries") return send(res, 200, { countries: store.countries });
  if (req.method === "GET" && url.pathname.endsWith("/cities")) return send(res, 200, { cities: store.cities.filter((city) => city.country_id === countryId) });
  if (req.method === "GET" && url.pathname.endsWith("/payments/methods")) return send(res, 200, { providers: country.payments, currency: country.currency, abstraction_ready: true });
  if (req.method === "GET" && url.pathname.endsWith("/feature-flags")) return send(res, 200, { flags: store.feature_flags });
  if (req.method === "GET" && url.pathname.endsWith("/compliance/reviews")) return send(res, 200, { reviews: store.compliance_reviews, regulated_features_blocked: store.compliance_reviews.filter((item) => item.legal_hold).length });
  if (req.method === "GET" && url.pathname.endsWith("/recommendations")) {
    const user = userFromRequest(req);
    return send(res, 200, { recommendations: recommendationsFor(user, countryId), role: user ? user.role : "guest" });
  }

  if (req.method === "POST" && url.pathname.endsWith("/auth/login")) {
    const body = await readBody(req);
    const user = store.users.find((item) => (item.email === body.email || item.phone === body.phone) && item.country_id === countryId);
    if (!user || !verifyPassword(body.password || "", user.password_hash)) return sendError(res, 401, "Invalid credentials");
    const token = randomUUID();
    store.sessions[token] = { user_id: user.id, created_at: Date.now(), expires_at: Date.now() + SESSION_TTL_MS };
    audit(user, "auth.login", "user", user.id);
    saveStore();
    return send(res, 200, { token, user: publicUser(user), expires_in_seconds: SESSION_TTL_MS / 1000 });
  }

  if (req.method === "POST" && url.pathname.endsWith("/auth/register")) {
    const body = await readBody(req);
    const role = ["customer", "driver", "merchant", "admin"].includes(body.role) ? body.role : "customer";
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const name = String(body.name || "").trim();
    const password = String(body.password || "");
    if (!name || !email || !phone || password.length < 8) {
      return sendError(res, 400, "Name, email, phone, and an 8+ character password are required");
    }
    if (store.users.some((item) => item.email === email || item.phone === phone)) {
      return sendError(res, 409, "Email or phone is already registered");
    }
    const user = {
      id: randomUUID(),
      name,
      email,
      phone,
      role,
      country_id: countryId,
      city_id: body.city_id || "bole",
      currency: country.currency,
      language: body.language || "en",
      timezone: country.timezone,
      password_hash: hashPassword(password),
      status: "active",
      created_at: new Date().toISOString()
    };
    store.users.push(user);
    if (role === "customer") {
      store.customers.push({
        id: randomUUID(),
        user_id: user.id,
        country_id: countryId,
        city_id: user.city_id,
        currency: user.currency,
        language: user.language,
        timezone: user.timezone,
        wallet_balance: 0,
        senior_mode: false,
        family_account: Boolean(body.family_account),
        preferred_address: body.preferred_address || "",
        landmark_note: body.landmark_note || "",
        emergency_contact_name: body.emergency_contact_name || "",
        emergency_contact_phone: body.emergency_contact_phone || "",
        support_preference: body.support_preference || "app"
      });
    }
    if (role === "driver") {
      store.drivers.push({
        id: randomUUID(),
        user_id: user.id,
        country_id: countryId,
        city_id: user.city_id,
        currency: user.currency,
        language: user.language,
        timezone: user.timezone,
        online: true,
        frozen: false,
        safety_score: 95,
        badge_level: "New Driver",
        float_balance: 0,
        cash_collected: 0,
        earnings: 0,
        latitude: Number(body.latitude || 8.993),
        longitude: Number(body.longitude || 38.788),
        vehicle_type: body.vehicle_type || "motorbike",
        vehicle_plate: body.vehicle_plate || "",
        license_number: body.license_number || "",
        assigned_zone: body.assigned_zone || "Bole",
        emergency_contact_name: body.emergency_contact_name || "",
        emergency_contact_phone: body.emergency_contact_phone || "",
        verification_status: "pending",
        training_status: "not_started"
      });
    }
    if (role === "merchant") {
      store.merchants.push({
        id: randomUUID(),
        owner_user_id: user.id,
        country_id: countryId,
        city_id: user.city_id,
        currency: user.currency,
        language: user.language,
        timezone: user.timezone,
        name: body.business_name || `${name}'s Store`,
        category: body.category || "restaurant",
        women_owned: Boolean(body.women_owned),
        verified: false,
        status: "open",
        commission_rate: 0.12,
        rating: 0,
        address_note: body.merchant_address || body.address_note || "Local signup merchant",
        contact_phone: body.merchant_phone || phone,
        manager_name: body.manager_name || name,
        opening_hours: body.opening_hours || "Hours not set",
        prep_time_minutes: Number(body.prep_time_minutes || 20),
        delivery_radius_km: Number(body.delivery_radius_km || 3),
        payout_schedule: "weekly",
        trust_score: 50,
        verification_status: "pending",
        support_notes: "New merchant signup. Verify address, phone, menu, and payout details before production launch."
      });
    }
    const token = randomUUID();
    store.sessions[token] = { user_id: user.id, created_at: Date.now(), expires_at: Date.now() + SESSION_TTL_MS };
    audit(user, "auth.register", "user", user.id, { role });
    broadcast("auth.registered", { user_id: user.id, role });
    saveStore();
    return send(res, 201, { token, user: publicUser(user), expires_in_seconds: SESSION_TTL_MS / 1000 });
  }

  if (req.method === "GET" && url.pathname.endsWith("/auth/me")) {
    const user = requireUser(req, res);
    if (!user) return;
    return send(res, 200, { user: publicUser(user) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/profile/details")) {
    const user = requireUser(req, res);
    if (!user) return;
    const profile = {
      user: publicUser(user),
      customer: store.customers.find((item) => item.user_id === user.id) || null,
      driver: store.drivers.find((item) => item.user_id === user.id) || null,
      merchant: store.merchants.find((item) => item.owner_user_id === user.id) || null
    };
    return send(res, 200, { profile });
  }

  if (req.method === "GET" && url.pathname.endsWith("/merchants")) {
    const city = url.searchParams.get("city");
    const category = String(url.searchParams.get("category") || "").toLowerCase();
    const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
    const lat = Number(url.searchParams.get("lat") || HQ_COORDS.lat);
    const lng = Number(url.searchParams.get("lng") || HQ_COORDS.lng);
    const radiusKm = Number(url.searchParams.get("radius_km") || 999);
    const minRating = Number(url.searchParams.get("min_rating") || 0);
    const sort = url.searchParams.get("sort") || "default";
    let merchants = store.merchants
      .filter((merchant) => merchant.country_id === countryId && (!city || merchant.city_id === city))
      .filter((merchant) => !category || merchant.category === category)
      .filter((merchant) => !search || [merchant.name, merchant.category, merchant.address_note, merchant.support_notes].join(" ").toLowerCase().includes(search))
      .map((merchant) => ({
        ...merchant,
        distance_km: Number(distanceKm({ lat, lng }, { lat: merchant.latitude, lng: merchant.longitude }).toFixed(2))
      }))
      .filter((merchant) => merchant.distance_km <= radiusKm && Number(merchant.rating || 0) >= minRating);
    if (sort === "nearest") merchants = merchants.sort((a, b) => a.distance_km - b.distance_km);
    if (sort === "rating") merchants = merchants.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    if (sort === "reviews") merchants = merchants.sort((a, b) => Number(b.review_count || 0) - Number(a.review_count || 0));
    return send(res, 200, { merchants });
  }

  const merchantDetailMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/merchants\/([^/]+)$/);
  if (req.method === "GET" && merchantDetailMatch) {
    const merchant = store.merchants.find((item) => item.id === merchantDetailMatch[1] && item.country_id === countryId);
    if (!merchant) return sendError(res, 404, "Merchant not found");
    const products = store.products.filter((item) => item.merchant_id === merchant.id);
    const trust = store.trust_verifications.filter((item) => item.entity_type === "merchant" && item.entity_id === merchant.id);
    return send(res, 200, { merchant, products, trust });
  }

  const merchantProductsMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/merchants\/([^/]+)\/products$/);
  if (req.method === "GET" && merchantProductsMatch) {
    const products = store.products.filter((product) => product.merchant_id === merchantProductsMatch[1] && product.country_id === countryId);
    return send(res, 200, { products });
  }

  if (req.method === "GET" && url.pathname.endsWith("/products")) {
    return send(res, 200, { products: store.products.filter((product) => product.country_id === countryId) });
  }

  if (req.method === "POST" && url.pathname.endsWith("/menu-requests")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const merchant = store.merchants.find((item) => item.id === body.merchant_id && item.country_id === countryId);
    if (!merchant) return sendError(res, 404, "Merchant not found");
    const request = {
      id: randomUUID(),
      country_id: countryId,
      city_id: merchant.city_id,
      currency: merchant.currency,
      language: user.language,
      timezone: merchant.timezone,
      customer_user_id: user.id,
      merchant_id: merchant.id,
      item_name: String(body.item_name || "Special request").slice(0, 80),
      note: String(body.note || "").slice(0, 240),
      status: "requested",
      created_at: new Date().toISOString()
    };
    store.menu_requests.push(request);
    audit(user, "menu_request.created", "menu_request", request.id);
    broadcast("menu.requested", { request_id: request.id, merchant_id: merchant.id, item_name: request.item_name });
    saveStore();
    return send(res, 201, { request });
  }

  if (req.method === "GET" && url.pathname.endsWith("/menu-requests")) {
    const user = requireUser(req, res, ["customer", "merchant", "admin"]);
    if (!user) return;
    const requests = store.menu_requests.filter((request) => {
      if (request.country_id !== countryId) return false;
      if (user.role === "customer") return request.customer_user_id === user.id;
      if (user.role === "merchant") {
        const merchant = store.merchants.find((item) => item.id === request.merchant_id);
        return merchant && merchant.owner_user_id === user.id;
      }
      return true;
    });
    return send(res, 200, { requests });
  }

  if (req.method === "GET" && url.pathname.endsWith("/cart")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    return send(res, 200, { cart: getCart(user.id, countryId) });
  }

  if (req.method === "POST" && url.pathname.endsWith("/cart/sample")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const bundle = body.bundle || "family_lunch";
    const bundleItems = {
      family_lunch: [
        { product_id: "product-1", quantity: 1 },
        { product_id: "product-2", quantity: 1 }
      ],
      grocery_pack: [
        { product_id: "product-3", quantity: 2 },
        { product_id: "product-4", quantity: 1 }
      ],
      almaz_market: [
        { product_id: "product-5", quantity: 2 }
      ]
    };
    const cart = getCart(user.id, countryId);
    const items = calculateItems(bundleItems[bundle] || bundleItems.family_lunch, countryId);
    const merchantIds = [...new Set(items.map((item) => item.merchant_id))];
    if (merchantIds.length > 1) return sendError(res, 409, "Sample cart bundles must use one merchant at a time");
    cart.items = items;
    saveStore();
    return send(res, 201, { cart, bundle });
  }

  if (req.method === "POST" && url.pathname.endsWith("/cart/items")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const [item] = calculateItems([{ product_id: body.product_id, quantity: body.quantity }], countryId);
    const cart = getCart(user.id, countryId);
    const existing = cart.items.find((entry) => entry.product_id === item.product_id);
    if (existing) existing.quantity += item.quantity;
    else cart.items.push(item);
    saveStore();
    return send(res, 201, { cart });
  }

  if (req.method === "DELETE" && url.pathname.endsWith("/cart")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const cart = getCart(user.id, countryId);
    cart.items = [];
    saveStore();
    return send(res, 200, { cart });
  }

  if (req.method === "POST" && url.pathname.endsWith("/orders")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const cart = getCart(user.id, countryId);
    const sourceItems = body.items && body.items.length ? calculateItems(body.items, countryId) : cart.items;
    if (!sourceItems.length) return sendError(res, 400, "Order requires at least one item");
    const merchantIds = [...new Set(sourceItems.map((item) => item.merchant_id))];
    if (merchantIds.length > 1) return sendError(res, 409, "One order can contain items from one merchant only");
    const subtotal = sourceItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const deliveryFee = body.community_delivery ? 35 : 60;
    const mapQuote = quoteDelivery(body.destination || {});
    const order = {
      id: randomUUID(),
      country_id: countryId,
      city_id: body.city_id || user.city_id,
      currency: country.currency,
      language: user.language,
      timezone: country.timezone,
      customer_user_id: user.id,
      merchant_id: merchantIds[0],
      driver_id: null,
      status: "placed",
      subtotal,
      delivery_fee: body.destination ? mapQuote.fee : deliveryFee,
      total: subtotal + (body.destination ? mapQuote.fee : deliveryFee),
      payment_method: body.payment_method || "cash",
      cash_on_delivery: (body.payment_method || "cash") === "cash",
      address_note: body.address_note || "Landmark required",
      safety_mode: body.safety_mode || "standard",
      community_delivery: Boolean(body.community_delivery),
      map_quote: mapQuote,
      items: sourceItems,
      status_history: [{ status: "placed", actor_user_id: user.id, at: new Date().toISOString() }],
      created_at: new Date().toISOString()
    };
    store.orders.push(order);
    store.map_quotes.push({ id: randomUUID(), order_id: order.id, country_id: countryId, ...mapQuote, created_at: new Date().toISOString() });
    logSms({
      to: user.phone,
      template: "ORDER_PLACED",
      body: `HabeshaGo: your order ${order.id.slice(0, 8)} was placed. Total ${order.total} ${order.currency}.`,
      country_id: countryId,
      user_id: user.id,
      order_id: order.id
    });
    cart.items = [];
    audit(user, "order.created", "order", order.id, { total: order.total });
    notifyUser({
      user_id: user.id,
      country_id: countryId,
      order_id: order.id,
      type: "order_placed",
      title: "Order placed",
      body: `Your order ${order.id.slice(0, 8)} was placed for ${order.total} ${order.currency}.`
    });
    broadcast("order.created", { order_id: order.id, status: order.status, total: order.total });
    saveStore();
    return send(res, 201, { order });
  }

  const paymentMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/payments\/simulate$/);
  if (req.method === "POST" && paymentMatch) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const order = store.orders.find((item) => item.id === body.order_id && item.country_id === countryId);
    if (!order) return sendError(res, 404, "Order not found");
    const provider = body.provider || order.payment_method || "Cash";
    const allowedProviders = country.payments || [];
    if (!allowedProviders.includes(provider)) return sendError(res, 400, "Payment provider is not configured for this country", { allowedProviders });
    const payment = {
      id: randomUUID(),
      order_id: order.id,
      user_id: user.id,
      country_id: countryId,
      city_id: order.city_id,
      currency: order.currency,
      provider,
      amount: order.total,
      status: body.force_fail ? "failed" : provider === "Cash" ? "cash_pending_collection" : "authorized_simulated",
      reference: `SIM-${Date.now()}`,
      real_money_moved: false,
      created_at: new Date().toISOString()
    };
    store.payment_transactions.push(payment);
    order.payment_status = payment.status;
    audit(user, "payment.simulated", "payment_transaction", payment.id, { provider, amount: payment.amount });
    saveStore();
    return send(res, 201, { payment });
  }

  if (req.method === "POST" && url.pathname.endsWith("/sms/simulate")) {
    const user = requireUser(req, res, ["customer", "merchant", "driver", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const message = logSms({
      to: body.to || user.phone,
      template: body.template || "SUPPORT_TEST",
      body: body.body || "HabeshaGo simulated SMS test.",
      country_id: countryId,
      user_id: user.id,
      order_id: body.order_id
    });
    saveStore();
    return send(res, 201, { message });
  }

  if (req.method === "GET" && url.pathname.endsWith("/sms/messages")) {
    const user = requireUser(req, res, ["admin"]);
    if (!user) return;
    return send(res, 200, { messages: store.sms_messages.filter((message) => message.country_id === countryId) });
  }

  if (req.method === "POST" && url.pathname.endsWith("/maps/quote")) {
    const body = await readBody(req);
    const quote = { id: randomUUID(), country_id: countryId, ...quoteDelivery(body.destination || body), created_at: new Date().toISOString() };
    store.map_quotes.push(quote);
    saveStore();
    return send(res, 201, { quote });
  }

  if (req.method === "GET" && url.pathname.endsWith("/maps/quotes")) {
    const user = requireUser(req, res, ["admin"]);
    if (!user) return;
    return send(res, 200, { quotes: store.map_quotes.filter((quote) => quote.country_id === countryId) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/orders")) {
    const user = requireUser(req, res);
    if (!user) return;
    const orders = store.orders.filter((order) => {
      if (order.country_id !== countryId) return false;
      if (user.role === "customer") return order.customer_user_id === user.id;
      if (user.role === "merchant") {
        const merchant = store.merchants.find((item) => item.id === order.merchant_id);
        return merchant && merchant.owner_user_id === user.id;
      }
      return true;
    });
    return send(res, 200, { orders: orders.map(enrichOrder) });
  }

  const requestDriverMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/orders\/([^/]+)\/request-driver$/);
  if (req.method === "POST" && requestDriverMatch) {
    const user = requireUser(req, res, ["merchant", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const order = store.orders.find((item) => item.id === requestDriverMatch[1] && item.country_id === countryId);
    if (!order) return sendError(res, 404, "Order not found");
    if (!["ready_for_pickup", "driver_requested"].includes(order.status)) return sendError(res, 409, "Order must be ready for pickup before requesting a driver");
    let request = store.dispatch_requests.find((item) => item.order_id === order.id && ["requested", "offered"].includes(item.status));
    if (!request) {
      request = {
        id: randomUUID(),
        country_id: countryId,
        city_id: order.city_id,
        currency: order.currency,
        language: order.language,
        timezone: order.timezone,
        order_id: order.id,
        merchant_id: order.merchant_id,
        driver_id: null,
        status: "requested",
        pickup_note: body.pickup_note || "Ready at merchant counter",
        delivery_fee: order.delivery_fee,
        eta_minutes: order.map_quote ? order.map_quote.eta_minutes : 20,
        created_at: new Date().toISOString()
      };
      store.dispatch_requests.push(request);
    }
    transitionOrder(order, "driver_requested", user, "driver_requested");
    broadcast("dispatch.requested", { request_id: request.id, order_id: order.id, eta_minutes: request.eta_minutes });
    saveStore();
    return send(res, 201, { request, order });
  }

  if (req.method === "GET" && url.pathname.endsWith("/customers/orders")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const orders = store.orders.filter((order) => user.role === "admin" || order.customer_user_id === user.id);
    return send(res, 200, { orders: orders.map(enrichOrder) });
  }

  if (req.method === "GET" && url.pathname.endsWith("/notifications")) {
    const user = requireUser(req, res);
    if (!user) return;
    const notifications = store.notifications
      .filter((item) => item.country_id === countryId && (item.user_id === user.id || user.role === "admin"))
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return send(res, 200, { notifications });
  }

  const orderStatusMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/orders\/([^/]+)\/status$/);
  if (req.method === "PATCH" && orderStatusMatch) {
    const user = requireUser(req, res, ["merchant", "driver", "admin"]);
    if (!user) return;
    const body = await readBody(req);
    const order = store.orders.find((item) => item.id === orderStatusMatch[1] && item.country_id === countryId);
    if (!order) return sendError(res, 404, "Order not found");
    try {
      transitionOrder(order, body.status, user, body.reason);
    } catch (error) {
      return sendError(res, error.status || 500, error.message);
    }
    if (body.status === "delivered") {
      const driver = store.drivers.find((item) => item.user_id === user.id || item.id === order.driver_id) || store.drivers[0];
      driver.earnings += 45;
      if (order.cash_on_delivery) driver.cash_collected += order.total;
    }
    saveStore();
    return send(res, 200, { order });
  }

  if (req.method === "GET" && url.pathname.endsWith("/drivers/available")) {
    const lat = Number(url.searchParams.get("lat") || HQ_COORDS.lat);
    const lng = Number(url.searchParams.get("lng") || HQ_COORDS.lng);
    const radiusKm = Number(url.searchParams.get("radius_km") || 999);
    const drivers = store.drivers
      .filter((driver) => driver.country_id === countryId && driver.online && !driver.frozen)
      .map((driver) => ({
        ...driver,
        distance_km: Number(distanceKm({ lat, lng }, { lat: driver.latitude, lng: driver.longitude }).toFixed(2)),
        eta_minutes: Math.max(4, Math.round(3 + distanceKm({ lat, lng }, { lat: driver.latitude, lng: driver.longitude }) * 5))
      }))
      .filter((driver) => driver.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
    return send(res, 200, { drivers });
  }

  if (req.method === "GET" && url.pathname.endsWith("/drivers/requests")) {
    const user = requireUser(req, res, ["driver", "admin"]);
    if (!user) return;
    return send(res, 200, { requests: store.dispatch_requests.filter((request) => request.country_id === countryId && ["requested", "offered"].includes(request.status)) });
  }

  const acceptDispatchMatch = url.pathname.match(/^\/api\/[^/]+\/v1\/drivers\/requests\/([^/]+)\/accept$/);
  if (req.method === "POST" && acceptDispatchMatch) {
    const user = requireUser(req, res, ["driver", "admin"]);
    if (!user) return;
    const driver = store.drivers.find((item) => item.user_id === user.id || user.role === "admin");
    const request = store.dispatch_requests.find((item) => item.id === acceptDispatchMatch[1] && item.country_id === countryId);
    if (!driver || !request) return sendError(res, 404, "Driver request not found");
    if (!["requested", "offered"].includes(request.status)) return sendError(res, 409, "Driver request is no longer available");
    const order = store.orders.find((item) => item.id === request.order_id);
    request.status = "accepted";
    request.driver_id = driver.id;
    request.accepted_at = new Date().toISOString();
    order.driver_id = driver.id;
    transitionOrder(order, "driver_accepted", user, "driver_accept");
    broadcast("dispatch.accepted", { request_id: request.id, order_id: order.id, driver_id: driver.id });
    saveStore();
    return send(res, 200, { request, order });
  }

  if (req.method === "GET" && url.pathname.endsWith("/wallet")) {
    const user = requireUser(req, res, ["customer", "admin"]);
    if (!user) return;
    const customer = store.customers.find((item) => item.user_id === user.id);
    return send(res, 200, { balance: customer ? customer.wallet_balance : 0, currency: user.currency });
  }

  if (req.method === "POST" && url.pathname.endsWith("/wallet/admin-adjustment")) {
    const user = requireUser(req, res, ["admin"]);
    if (!user) return;
    const body = await readBody(req);
    const target = store.customers.find((item) => item.user_id === body.user_id);
    if (!target) return sendError(res, 404, "Customer wallet not found");
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount === 0) return sendError(res, 400, "Amount must be a non-zero number");
    target.wallet_balance += amount;
    const transaction = {
      id: randomUUID(),
      user_id: body.user_id,
      country_id: countryId,
      city_id: target.city_id,
      currency: target.currency,
      amount,
      type: "admin_adjustment",
      reason: body.reason || "manual_adjustment",
      actor_user_id: user.id,
      immutable: true,
      created_at: new Date().toISOString()
    };
    store.wallet_transactions.push(transaction);
    audit(user, "wallet.admin_adjustment", "wallet_transaction", transaction.id, { amount });
    saveStore();
    return send(res, 201, { transaction, balance: target.wallet_balance });
  }

  if (req.method === "POST" && url.pathname.endsWith("/support/tickets")) {
    const user = requireUser(req, res);
    if (!user) return;
    const body = await readBody(req);
    const ticket = {
      id: randomUUID(),
      user_id: user.id,
      country_id: countryId,
      city_id: user.city_id,
      currency: user.currency,
      language: user.language,
      timezone: user.timezone,
      subject: body.subject || "Support request",
      status: "open",
      priority: body.priority || "normal",
      created_at: new Date().toISOString()
    };
    store.support_tickets.push(ticket);
    saveStore();
    return send(res, 201, { ticket });
  }

  if (url.pathname.includes("/admin/")) {
    const user = requireUser(req, res, ["admin"]);
    if (!user) return;
    if (req.method === "GET" && url.pathname.endsWith("/admin/orders")) return send(res, 200, { orders: store.orders.filter((order) => order.country_id === countryId).map(enrichOrder) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/merchants")) return send(res, 200, { merchants: store.merchants.filter((merchant) => merchant.country_id === countryId) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/drivers")) return send(res, 200, { drivers: store.drivers.filter((driver) => driver.country_id === countryId) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/wallet-transactions")) return send(res, 200, { transactions: store.wallet_transactions.filter((tx) => tx.country_id === countryId) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/payment-transactions")) return send(res, 200, { transactions: store.payment_transactions.filter((tx) => tx.country_id === countryId) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/sms-messages")) return send(res, 200, { messages: store.sms_messages.filter((message) => message.country_id === countryId) });
    if (req.method === "GET" && url.pathname.endsWith("/admin/trust-verifications")) return send(res, 200, { verifications: store.trust_verifications });
    if (req.method === "GET" && url.pathname.endsWith("/admin/details")) {
      return send(res, 200, {
        countries: store.countries,
        cities: store.cities.filter((city) => city.country_id === countryId),
        merchants: store.merchants.filter((merchant) => merchant.country_id === countryId),
        products: store.products.filter((product) => product.country_id === countryId),
        drivers: store.drivers.filter((driver) => driver.country_id === countryId),
        customers: store.customers.filter((customer) => customer.country_id === countryId),
        compliance_reviews: store.compliance_reviews,
        trust_verifications: store.trust_verifications
      });
    }
    if (req.method === "GET" && url.pathname.endsWith("/admin/reports")) {
      const orders = store.orders.filter((order) => order.country_id === countryId);
      return send(res, 200, {
        orders_total: orders.length,
        orders_completed: orders.filter((order) => order.status === "delivered").length,
        gross_value: orders.reduce((sum, order) => sum + order.total, 0),
        active_merchants: store.merchants.filter((merchant) => merchant.country_id === countryId && merchant.status === "open").length,
        unresolved_cash_reconciliation: store.drivers.filter((driver) => driver.cash_collected > driver.float_balance).length,
        support_open: store.support_tickets.filter((ticket) => ticket.status === "open").length
        ,
        simulated_payments: store.payment_transactions.filter((tx) => tx.country_id === countryId).length,
        simulated_sms: store.sms_messages.filter((message) => message.country_id === countryId).length,
        map_quotes: store.map_quotes.filter((quote) => quote.country_id === countryId).length,
        legal_holds: store.compliance_reviews.filter((review) => review.legal_hold).length
      });
    }
  }

  if (req.method === "POST" && url.pathname.endsWith("/voice/command")) {
    return send(res, 423, { module: "Tenagn voice-first mode", enabled: false, message: "Feature flagged. Final order confirmation required before enablement." });
  }
  if (req.method === "GET" && url.pathname.endsWith("/feed")) {
    return send(res, 423, { module: "Yene Guzo social feed", enabled: false, message: "Placeholder behind feature flag." });
  }

  sendError(res, 404, "Route not found", { path: url.pathname });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return send(res, 200, {});
  if (url.pathname.startsWith("/api/") || url.pathname === "/health") {
    try {
      return await handleApi(req, res, url);
    } catch (error) {
      return sendError(res, error.status || 500, error.message || "Internal error");
    }
  }
  if (serveStatic(req, res, url.pathname)) return;
  if (!url.pathname.includes(".")) {
    req.url = "/";
    return serveStatic(req, res, "/");
  }
  sendError(res, 404, "Static asset not found");
});

server.listen(port, () => {
  console.log(`HabeshaGo local MVP listening on http://localhost:${port}`);
});
