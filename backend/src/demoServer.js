const http = require("http");
const { randomUUID } = require("crypto");

const port = Number(process.env.PORT || 4000);

const countries = [
  { id: "ET", name: "Ethiopia", currency: "ETB", timezone: "Africa/Addis_Ababa", languages: ["am", "en", "om", "ti"] },
  { id: "KE", name: "Kenya", currency: "KES", timezone: "Africa/Nairobi", languages: ["en", "sw"] },
  { id: "TZ", name: "Tanzania", currency: "TZS", timezone: "Africa/Dar_es_Salaam", languages: ["sw", "en"] },
  { id: "UG", name: "Uganda", currency: "UGX", timezone: "Africa/Kampala", languages: ["en", "lg", "sw"] },
  { id: "RW", name: "Rwanda", currency: "RWF", timezone: "Africa/Kigali", languages: ["rw", "en", "fr"] },
  { id: "SS", name: "South Sudan", currency: "SSP", timezone: "Africa/Juba", languages: ["en", "ar", "jub"] }
];

const cities = [
  { id: "bole", country_id: "ET", name: "Bole", active: true },
  { id: "addis-ababa", country_id: "ET", name: "Addis Ababa", active: true },
  { id: "adama", country_id: "ET", name: "Adama", active: false },
  { id: "nairobi", country_id: "KE", name: "Nairobi", active: false },
  { id: "kigali", country_id: "RW", name: "Kigali", active: false }
];

const merchants = [
  { id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Addis Chefs", category: "restaurant", women_owned: true, verified: true, status: "open" },
  { id: "merchant-2", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Bole Fresh Grocery", category: "grocery", women_owned: false, verified: true, status: "open" }
];

const products = [
  { id: "product-1", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Kitfo", price: 350 },
  { id: "product-2", merchant_id: "merchant-1", country_id: "ET", city_id: "bole", currency: "ETB", language: "am", timezone: "Africa/Addis_Ababa", name: "Shiro", price: 220 },
  { id: "product-3", merchant_id: "merchant-2", country_id: "ET", city_id: "bole", currency: "ETB", language: "en", timezone: "Africa/Addis_Ababa", name: "Fresh Injera Pack", price: 120 }
];

const orders = [];

function send(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(payload, null, 2));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

function countryFromPath(pathname) {
  const match = pathname.match(/^\/api\/([^/]+)\/v1/);
  return match ? match[1].toUpperCase() : "ET";
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const countryId = countryFromPath(url.pathname);

  if (req.method === "OPTIONS") return send(res, 200, {});
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, { status: "ok", service: "HabeshaGo dependency-free demo API", express_api: "src/server.js" });
  }
  if (req.method === "GET" && url.pathname === "/api/v1/countries") return send(res, 200, { countries });
  if (req.method === "GET" && url.pathname.endsWith("/cities")) return send(res, 200, { cities: cities.filter((city) => city.country_id === countryId) });
  if (req.method === "GET" && url.pathname.endsWith("/merchants")) return send(res, 200, { merchants: merchants.filter((merchant) => merchant.country_id === countryId) });
  if (req.method === "GET" && url.pathname.includes("/merchants/") && url.pathname.endsWith("/products")) {
    const merchantId = url.pathname.split("/").at(-2);
    return send(res, 200, { products: products.filter((product) => product.merchant_id === merchantId && product.country_id === countryId) });
  }
  if (req.method === "POST" && url.pathname.endsWith("/auth/login")) {
    const body = await readBody(req);
    return send(res, 200, { token: `demo.${Buffer.from(body.email || "guest").toString("base64url")}`, user: { email: body.email, role: body.email && body.email.startsWith("admin") ? "admin" : "customer", country_id: countryId } });
  }
  if (req.method === "POST" && url.pathname.endsWith("/orders")) {
    const body = await readBody(req);
    const order = { id: randomUUID(), country_id: countryId, city_id: body.city_id || "bole", currency: "ETB", status: "placed", items: body.items || [], total: body.total || 410, payment_method: body.payment_method || "cash" };
    orders.push(order);
    return send(res, 201, { order });
  }
  if (req.method === "GET" && url.pathname.endsWith("/feature-flags")) {
    return send(res, 200, { flags: ["DRIVER_AGENT_ENABLED", "MERCHANT_ADVANCE_ENABLED", "DIASPORA_FUNDING_ENABLED", "CROSS_BORDER_WALLET_ENABLED", "SOCIAL_FEED_ENABLED", "VOICE_ORDERING_ENABLED", "NIGHT_SAFETY_ENABLED", "CHILD_DELIVERY_ENABLED"].map((key) => ({ key, enabled: false })) });
  }

  send(res, 404, { error: "Demo route not found", path: url.pathname, full_express_api: "Run npm install, then npm run dev for the complete Express API." });
});

server.listen(port, () => {
  console.log(`HabeshaGo demo API listening on http://localhost:${port}`);
});
