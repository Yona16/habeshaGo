const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const authBaseUrl = process.env.AUTH_BASE_URL || "http://localhost:4000/api/ET/v1";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { response, data };
}

async function authRequest(path, options = {}) {
  const response = await fetch(`${authBaseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  return { response, data };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function step(name, run) {
  await run();
  console.log(`PASS ${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  let token = "";
  let adminToken = "";
  let merchantToken = "";
  let driverToken = "";
  let flowOrderId = "";

  await step("web app loads", async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    assert(response.ok, "Home page did not load");
    assert(html.includes("HabeshaGo"), "Home page did not include app name");
    assert(html.includes("<title>HabeshaGo | Food, Grocery &amp; Delivery in Addis Ababa</title>"), "SEO homepage title is missing");
    assert(html.includes('rel="canonical" href="https://www.habeshago.com/"'), "SEO homepage canonical is missing");
    assert(html.includes("application/ld+json"), "SEO homepage JSON-LD is missing");
    assert(html.includes('location.replace("/app"+location.hash)'), "Hash admin redirect to /app is missing");
  });

  await step("customer app loads separately", async () => {
    const response = await fetch(`${baseUrl}/app`);
    const html = await response.text();
    assert(response.ok, "Customer app did not load");
    assert(html.includes("HabeshaGo Customer App"), "Polished customer app title is missing");
    assert(html.includes("cartDrawer"), "Customer cart drawer is missing");
    assert(html.includes("merchantGrid"), "Customer merchant grid is missing");
    assert(html.includes("leafletMap"), "Customer map is missing");
    assert(html.includes("promo-banner") && html.includes("recommendedGrid"), "Customer promo/recommended sections are missing");
    assert(html.includes("heroLocation") && html.includes("currentLocationBtn"), "Customer address/current-location controls are missing");
    assert(html.includes("menuRequestBtn") && html.includes("cartDrawerSummary"), "Menu request or cart summary controls are missing");
    assert(html.includes("customerAccountPanel") && html.includes("customerSignupBtn") && html.includes("customerLoginBtn"), "Customer signup/login panel is missing");
    assert(html.includes("paymentMethod"), "Customer checkout payment method is missing");
    assert(html.includes('name="robots" content="noindex, nofollow"'), "Customer app should be noindex");
    assert(html.includes("Run Live End-To-End Demo"), "Live end-to-end demo button label is missing");
    const appJs = await fetch(`${baseUrl}/app.js`);
    const js = await appJs.text();
    assert(js.includes("habeshago_token") && js.includes("habeshago_user"), "Customer app must use standard session storage keys");
    assert(js.includes("selectedMerchantOrThrow") && js.includes("Please choose a restaurant."), "Customer selected merchant validation is missing");
    assert(js.includes("customerSignup") && js.includes("customerLogin") && js.includes("/profile/details"), "Customer signup/login/details actions are missing");
    assert(js.includes("api(\"/orders\"") && !js.includes("api(\"/production-checklist\""), "Place order must use /orders, not production-checklist");
    assert(js.includes("getLatLng") && js.includes("Skipping invalid coordinates") && js.includes("console.log(\"Merchant:\"") && js.includes("console.log(\"Driver:\""), "Map coordinate guard/debugging is missing");
    assert(js.includes("updateCartItem") && js.includes("removeCartItem") && js.includes("sendMenuRequest"), "Customer cart/menu actions are missing");
  });

  await step("driver portal loads separately", async () => {
    const response = await fetch(`${baseUrl}/driver`);
    const html = await response.text();
    assert(response.ok, "Driver portal did not load");
    assert(html.includes("HabeshaGo Driver Portal"), "Driver portal title is missing");
    assert(html.includes("Available Delivery Requests"), "Driver available requests view is missing");
    assert(html.includes("Earnings & Wallet"), "Driver earnings/wallet view is missing");
    assert(html.includes("bottom-nav"), "Driver mobile bottom navigation is missing");
    assert(html.includes('/driver/driver.js') && html.includes('/driver/styles.css'), "Driver portal must use routed driver assets");
    const driverJs = await fetch(`${baseUrl}/driver/driver.js`);
    const driverScript = await driverJs.text();
    assert(driverJs.ok, "Driver portal JavaScript did not load");
    assert(driverScript.includes("loginBtn") && driverScript.includes("acceptRequest"), "Driver button handlers are missing");
    assert(driverScript.includes('api("/drivers/location", {') && driverScript.includes('method: "POST"'), "Driver movement must call POST /drivers/location");
  });

  await step("SEO pages, sitemap, robots, and PWA files work", async () => {
    const pages = ["/addis-ababa", "/bole", "/category/pizza", "/merchant/addis-chefs", "/product/kitfo", "/search?q=%E1%8D%92%E1%8B%9B"];
    for (const path of pages) {
      const response = await fetch(`${baseUrl}${path}`);
      const html = await response.text();
      assert(response.ok, `${path} did not load`);
      assert(html.includes("<title>"), `${path} missing title`);
      assert(html.includes('name="description"'), `${path} missing meta description`);
      assert(html.includes('rel="canonical"'), `${path} missing canonical`);
      assert(html.includes('property="og:title"'), `${path} missing Open Graph`);
      assert(html.includes('name="twitter:card"'), `${path} missing Twitter card`);
      assert(html.includes("application/ld+json"), `${path} missing structured data`);
    }
    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const sitemapXml = await sitemap.text();
    assert(sitemap.ok && sitemapXml.includes("https://www.habeshago.com/category/pizza"), "Sitemap missing public page");
    assert(!sitemapXml.includes("/admin") && !sitemapXml.includes("/checkout") && !sitemapXml.includes("/api/"), "Sitemap includes private/API pages");
    const robots = await fetch(`${baseUrl}/robots.txt`);
    const robotsText = await robots.text();
    assert(robots.ok && robotsText.includes("Disallow: /admin") && robotsText.includes("Sitemap: https://www.habeshago.com/sitemap.xml"), "robots.txt rules missing");
    const manifest = await fetch(`${baseUrl}/manifest.json`);
    const manifestData = await manifest.json();
    assert(manifest.ok && manifestData.name === "HabeshaGo" && manifestData.display === "standalone", "PWA manifest failed");
    const serviceWorker = await fetch(`${baseUrl}/service-worker.js`);
    assert(serviceWorker.ok, "Service worker failed");
    const admin = await fetch(`${baseUrl}/admin`);
    const adminHtml = await admin.text();
    assert(adminHtml.includes('name="robots" content="noindex, nofollow"'), "Admin portal should be noindex");
  });

  await step("health endpoint is ok", async () => {
    const { response, data } = await request("/health");
    assert(response.ok, "Health endpoint failed");
    assert(data.status === "ok", "Health endpoint returned unexpected status");
  });

  await step("production launch gate blocks local demo", async () => {
    const { response, data } = await request("/api/ET/v1/launch-gate");
    assert(response.status === 409, "Launch gate should block local-demo mode");
    assert(data.launch_allowed === false, "Launch gate unexpectedly allowed production launch");
    assert(Array.isArray(data.missing_environment), "Launch gate missing environment list");
  });

  await step("nearby search returns merchants", async () => {
    const { response, data } = await request("/api/ET/v1/merchants?lat=8.994&lng=38.789&radius_km=5&category=cafe&sort=nearest");
    assert(response.ok, "Nearby merchant search failed");
    assert((data.merchants || []).length > 0, "Nearby merchant search returned no cafes");
  });

  await step("public search supports English and Amharic", async () => {
    const pizza = await request("/api/ET/v1/search?q=pizza");
    assert(pizza.response.ok, "Pizza search failed");
    assert((pizza.data.products || []).length || (pizza.data.merchants || []).length || (pizza.data.categories || []).some((item) => item.name === "pizza"), "Pizza search returned no results");
    const amharicPizza = await request("/api/et/v1/search?q=%E1%8D%92%E1%8B%9B");
    assert(amharicPizza.response.ok && amharicPizza.data.normalized_query === "pizza", "Amharic pizza search failed");
    const coffee = await request("/api/ET/v1/search?q=%E1%89%A1%E1%8A%93");
    assert(coffee.response.ok && coffee.data.normalized_query === "coffee", "Amharic coffee search failed");
    const suggestions = await request("/api/ET/v1/search/suggestions?q=coffee");
    assert(suggestions.response.ok && Array.isArray(suggestions.data.suggestions), "Search suggestions failed");
  });

  await step("marketplace nearby compatibility API works", async () => {
    const { response, data } = await request("/api/marketplace/nearby?lat=8.994&lng=38.789&radiusKm=5&minimumReview=0&sortBy=nearest");
    assert(response.ok, "Marketplace nearby compatibility endpoint failed");
    assert((data.merchants || []).length > 0, "Marketplace nearby returned no merchants");
    assert(Array.isArray(data.drivers), "Marketplace nearby missing drivers");
  });

  await step("real-time sample locations are available", async () => {
    const { response, data } = await request("/api/ET/v1/locations/live?lat=8.994&lng=38.789");
    assert(response.ok, "Live location endpoint failed");
    assert(data.provider === "SIMULATED_REAL_TIME", "Live location provider was unexpected");
    assert((data.drivers || []).length > 0, "Live location endpoint returned no drivers");
  });

  await step("customer login works", async () => {
    const { response, data } = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "customer@habeshago.local", password: "Customer123!" })
    });
    assert(response.ok, "Customer login failed");
    assert(data.token, "Customer login did not return token");
    token = data.token;
  });

  await step("ready test accounts work", async () => {
    const accounts = [
      ["customer@test.com", "Customer123!", "customer"],
      ["merchant@test.com", "Merchant123!", "merchant"],
      ["driver@test.com", "Driver123!", "driver"],
      ["admin@test.com", "Admin123!", "admin"]
    ];
    for (const [email, password, role] of accounts) {
      const login = await request("/api/ET/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      assert(login.response.ok && login.data.user.role === role, `${email} login failed`);
    }
  });

  await step("configured frontend auth backend works", async () => {
    const stamp = Date.now();
    const signup = await authRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Frontend Auth Smoke",
        email: `frontend-auth-${stamp}@habeshago.local`,
        phone: `+2519${String(stamp).slice(-8)}`,
        password: "Customer123!",
        role: "customer",
        city_id: "bole",
        preferred_address: "Bole smoke address",
        landmark_note: "Smoke landmark"
      })
    });
    assert(signup.response.status === 201, "Configured auth signup failed");
    assert(signup.data.token && signup.data.user, "Configured auth signup missing token/user");
    const login = await authRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: signup.data.user.email, password: "Customer123!" })
    });
    assert(login.response.ok, "Configured auth login failed");
    const me = await authRequest("/auth/me", {
      headers: { Authorization: `Bearer ${login.data.token}` }
    });
    assert(me.response.ok && me.data.user.email === signup.data.user.email, "Configured auth /me failed");
  });

  await step("all role auth endpoints work", async () => {
    const roles = ["customer", "driver", "merchant", "admin"];
    const endpoints = ["/auth/signup", "/auth/register"];
    for (const endpoint of endpoints) {
      for (const role of roles) {
        const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const password = `${role[0].toUpperCase()}${role.slice(1)}123!`;
        const payload = {
          name: `Auth ${role}`,
          email: `${role}-${endpoint.includes("signup") ? "signup" : "register"}-${stamp}@habeshago.local`,
          phone: `+2519${stamp.slice(-8)}`,
          password,
          role,
          city_id: "bole",
          vehicle_type: "motorbike",
          vehicle_plate: `AA-2-${stamp.slice(-5)}`,
          license_number: `LIC-${stamp}`,
          assigned_zone: "Bole",
          business_name: `Auth ${role} Business`,
          category: "restaurant",
          manager_name: "Auth Manager",
          merchant_phone: `+251911${stamp.slice(-6)}`,
          merchant_address: "Bole demo address",
          preferred_address: "Bole customer address",
          landmark_note: "Near main road"
        };
        const created = await authRequest(endpoint, {
          method: "POST",
          body: JSON.stringify(payload)
        });
        assert(created.response.status === 201, `${endpoint} failed for ${role}`);
        assert(created.data.token && created.data.user && created.data.user.role === role, `${endpoint} returned wrong user for ${role}`);
        const login = await authRequest("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: payload.email, password })
        });
        assert(login.response.ok && login.data.token && login.data.user.role === role, `/auth/login failed for ${role}`);
        const me = await authRequest("/auth/me", {
          headers: { Authorization: `Bearer ${login.data.token}` }
        });
        assert(me.response.ok && me.data.user.email === payload.email, `/auth/me failed for ${role}`);
      }
    }
  });

  await step("manual configured live demo backend flow works", async () => {
    const stamp = Date.now();
    const signup = await authRequest("/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Live Demo Smoke",
        email: `live-demo-smoke-${stamp}@habeshago.local`,
        phone: `+2519${String(stamp).slice(-8)}`,
        password: "Customer123!",
        role: "customer",
        city_id: "bole"
      })
    });
    assert(signup.response.status === 201, "Live demo signup failed");
    const login = await authRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: signup.data.user.email, password: "Customer123!" })
    });
    assert(login.response.ok && login.data.token, "Live demo login failed");
    const headers = { Authorization: `Bearer ${login.data.token}` };
    const merchants = await authRequest("/merchants", { headers });
    assert(merchants.response.ok && (merchants.data.merchants || []).length > 0, "Live demo merchants failed");
    const products = await authRequest("/products", { headers });
    const product = (products.data.products || []).find((item) => item.available) || (products.data.products || [])[0];
    assert(products.response.ok && product, "Live demo products failed");
    const cart = await authRequest("/cart", {
      method: "POST",
      headers,
      body: JSON.stringify({ product_id: product.id, quantity: 1 })
    });
    assert(cart.response.status === 201, "Live demo cart add failed");
    const order = await authRequest("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({ payment_method: "Cash", address_note: "Live demo smoke address", destination: { lat: 8.997, lng: 38.786 } })
    });
    assert(order.response.status === 201 && order.data.order.status === "placed", "Live demo order failed");
    const detail = await authRequest(`/orders/${order.data.order.id}`, { headers });
    assert(detail.response.ok && detail.data.order.id === order.data.order.id, "Live demo order status failed");
  });

  await step("one-click live end-to-end demo delivers and reaches admin", async () => {
    const started = await request("/api/ET/v1/live-demo/start", {
      method: "POST",
      body: "{}"
    });
    assert(started.response.status === 201 && started.data.token && started.data.order, "Live demo start failed");
    assert((started.data.flow || []).includes("admin_dashboard_will_reflect_order"), "Live demo missing admin flow step");
    assert((started.data.flow || []).includes("driver_movement_visible"), "Live demo missing driver movement flow step");
    const orderId = started.data.order.id;
    const headers = { Authorization: `Bearer ${started.data.token}` };
    let detail;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      await sleep(850);
      detail = await request(`/api/ET/v1/orders/${orderId}`, { headers });
      if (detail.data.order?.status === "delivered") break;
    }
    assert(detail.response.ok && detail.data.order.status === "delivered", "Live demo did not deliver order");
    assert((detail.data.order.status_history || []).some((item) => item.status === "on_the_way"), "Live demo did not include on-the-way status");
    assert(detail.data.order.driver_location && detail.data.order.demo_route?.length >= 4, "Live demo did not expose driver movement details");
    const locations = await request("/api/ET/v1/locations/live?lat=8.994&lng=38.789");
    assert((locations.data.recent_locations || []).some((point) => point.order_id === orderId), "Live map did not include order-specific driver movement");
    const adminLogin = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@test.com", password: "Admin123!" })
    });
    assert(adminLogin.response.ok, "Admin test login failed after live demo");
    const adminOrders = await request("/api/ET/v1/admin/orders", {
      headers: { Authorization: `Bearer ${adminLogin.data.token}` }
    });
    assert((adminOrders.data.orders || []).some((order) => order.id === orderId && order.status === "delivered"), "Admin dashboard did not reflect delivered live order");
    const wallet = await request("/api/ET/v1/admin/wallet-transactions", {
      headers: { Authorization: `Bearer ${adminLogin.data.token}` }
    });
    assert((wallet.data.transactions || []).some((tx) => tx.order_id === orderId), "Wallet ledger did not track live order");
  });

  await step("sample cart can be created", async () => {
    const { response, data } = await request("/api/ET/v1/cart/sample", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bundle: "family_lunch" })
    });
    assert(response.status === 201, "Sample cart failed");
    assert((data.cart.items || []).length > 0, "Sample cart returned no items");
    const first = data.cart.items[0];
    const updated = await request("/api/ET/v1/cart/items", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ product_id: first.product_id, quantity: 3 })
    });
    assert(updated.response.ok && (updated.data.cart.items || []).some((item) => item.product_id === first.product_id && item.quantity === 3), "Cart quantity update failed");
    const removed = await request(`/api/ET/v1/cart/items/${first.product_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(removed.response.ok && !(removed.data.cart.items || []).some((item) => item.product_id === first.product_id), "Cart item remove failed");
  });

  await step("customer tools work", async () => {
    const promo = await request("/api/ET/v1/promos/validate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: "BOLE10", subtotal: 1000 })
    });
    assert(promo.response.ok && promo.data.discount > 0, "Promo validation failed");
    const address = await request("/api/ET/v1/addresses", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label: "Smoke address", sub_city: "Bole", woreda: "03", neighborhood: "Medhanealem", landmark: "Blue gate", lat: 8.994, lng: 38.789 })
    });
    assert(address.response.status === 201, "Saved address failed");
    const favorite = await request("/api/ET/v1/favorites", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ merchant_id: "merchant-1" })
    });
    assert(favorite.response.status === 201, "Favorite merchant failed");
    const review = await request("/api/ET/v1/reviews", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ merchant_id: "merchant-1", rating: 5, comment: "Smoke review" })
    });
    assert(review.response.status === 201, "Merchant review failed");
  });

  await step("customer can checkout with saved address, promo, payment, and track order", async () => {
    const { response, data } = await request("/api/ET/v1/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        payment_method: "Telebirr",
        promo_code: "BOLE10",
        address_label: "Smoke saved address",
        address_note: "Smoke test address near Bole",
        destination: { lat: 8.994, lng: 38.789 }
      })
    });
    assert(response.status === 201, "Order placement failed");
    assert(data.order && data.order.status === "placed", "Order was not placed");
    assert(data.order.payment_method === "Telebirr", "Order did not keep selected payment method");
    flowOrderId = data.order.id;
    const payment = await request("/api/ET/v1/payments/simulate", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ order_id: flowOrderId, provider: "Telebirr" })
    });
    assert(payment.response.status === 201 && payment.data.payment.status === "authorized_simulated", "Selected payment simulation failed");
    const tracked = await request(`/api/ET/v1/orders/${flowOrderId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(tracked.response.ok && tracked.data.order.id === flowOrderId, "Customer order tracking failed");
  });

  await step("merchant portal dashboard works", async () => {
    const login = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "merchant@habeshago.local", password: "Merchant123!" })
    });
    assert(login.response.ok, "Merchant login failed");
    merchantToken = login.data.token;
    const dashboard = await request("/api/ET/v1/merchant/dashboard", {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(dashboard.response.ok, "Merchant dashboard failed");
    assert(dashboard.data.merchant, "Merchant dashboard missing profile");
    assert((dashboard.data.products || []).length > 0, "Merchant dashboard missing products");
    assert(dashboard.data.payout && typeof dashboard.data.payout.payout_pending === "number", "Merchant dashboard missing payout summary");
    const wallet = await request("/api/ET/v1/wallet", {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(wallet.response.ok && typeof wallet.data.pending_payout === "number" && Array.isArray(wallet.data.transactions), "Merchant wallet endpoint failed");
  });

  await step("merchant signup creates a usable dashboard", async () => {
    const stamp = Date.now();
    const signup = await request("/api/ET/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({
        name: "Smoke Merchant Signup",
        email: `merchant-signup-${stamp}@habeshago.local`,
        phone: `+2518${String(stamp).slice(-8)}`,
        password: "Merchant123!",
        role: "merchant",
        city_id: "bole",
        business_name: "Smoke Signup Kitchen",
        category: "restaurant",
        manager_name: "Smoke Manager",
        merchant_phone: "+251911555777",
        merchant_address: "Bole smoke signup address"
      })
    });
    assert(signup.response.status === 201 && signup.data.user.role === "merchant", "Merchant signup failed");
    const dashboard = await request("/api/ET/v1/merchant/dashboard", {
      headers: { Authorization: `Bearer ${signup.data.token}` }
    });
    assert(dashboard.response.ok && dashboard.data.merchant.name === "Smoke Signup Kitchen", "Signed-up merchant dashboard failed");
  });

  await step("merchant portal profile, product, payout, and support actions work", async () => {
    const dashboard = await request("/api/ET/v1/merchant/dashboard", {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    const merchant = dashboard.data.merchant;
    const profile = await request(`/api/ET/v1/merchants/${merchant.id}/profile`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: merchant.name,
        category: merchant.category,
        manager_name: merchant.manager_name || "Smoke Manager",
        contact_phone: merchant.contact_phone || "+251900000003",
        opening_hours: "Mon-Sun 8:00 AM - 10:00 PM",
        address_note: merchant.address_note || "Smoke merchant address",
        prep_time_minutes: Number(merchant.prep_time_minutes || 18),
        delivery_radius_km: Number(merchant.delivery_radius_km || 4)
      })
    });
    assert(profile.response.ok && profile.data.merchant.id === merchant.id, "Merchant profile save failed");
    const stamp = Date.now();
    const created = await request(`/api/ET/v1/merchants/${merchant.id}/products`, {
      method: "POST",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: `Smoke Merchant Item ${stamp}`,
        category: "food",
        description: "Smoke-created merchant product.",
        image_url: "/assets/icon.svg",
        price: 275,
        stock_quantity: 9,
        prep_time_minutes: 12
      })
    });
    assert(created.response.status === 201 && created.data.product.id, "Merchant add product failed");
    const productId = created.data.product.id;
    const edited = await request(`/api/ET/v1/products/${productId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({
        name: `Edited Smoke Merchant Item ${stamp}`,
        category: "food",
        description: "Smoke-edited merchant product.",
        image_url: "/assets/icon.svg",
        price: 315,
        stock_quantity: 7,
        prep_time_minutes: 14
      })
    });
    assert(edited.response.ok && edited.data.product.price === 315 && edited.data.product.stock_quantity === 7 && edited.data.product.image_url, "Merchant edit product failed");
    const toggled = await request(`/api/ET/v1/products/${productId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ available: false })
    });
    assert(toggled.response.ok && toggled.data.product.available === false, "Merchant toggle availability failed");
    const support = await request("/api/ET/v1/support/tickets", {
      method: "POST",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ subject: "Merchant smoke support ticket", priority: "normal" })
    });
    assert(support.response.status === 201 && support.data.ticket.subject, "Merchant support ticket failed");
    const refreshed = await request("/api/ET/v1/merchant/dashboard", {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(refreshed.response.ok && refreshed.data.products.some((item) => item.id === productId), "Merchant dashboard did not reload added product");
    assert(refreshed.data.support_tickets.some((ticket) => ticket.id === support.data.ticket.id), "Merchant dashboard did not reload support ticket");
    const deleted = await request(`/api/ET/v1/products/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(deleted.response.ok && deleted.data.product.id === productId, "Merchant delete product failed");
  });

  await step("merchant receives, accepts, and prepares order", async () => {
    const incoming = await request("/api/ET/v1/merchant/dashboard", {
      headers: { Authorization: `Bearer ${merchantToken}` }
    });
    assert(incoming.response.ok && incoming.data.orders.some((order) => order.id === flowOrderId), "Merchant incoming orders missing customer order");
    const transitions = ["accepted", "preparing", "ready_for_pickup"];
    for (const status of transitions) {
      const update = await request(`/api/ET/v1/orders/${flowOrderId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${merchantToken}` },
        body: JSON.stringify({ status })
      });
      assert(update.response.ok && update.data.order.status === status, `Merchant status ${status} failed`);
    }
    const driverQueueLogin = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "driver@habeshago.local", password: "Driver123!" })
    });
    assert(driverQueueLogin.response.ok, "Driver queue login failed");
    const available = await request("/api/ET/v1/drivers/available-requests", {
      headers: { Authorization: `Bearer ${driverQueueLogin.data.token}` }
    });
    assert((available.data.requests || []).some((request) => request.order_id === flowOrderId), "Ready order did not create available driver request");
  });

  await step("merchant can reject an incoming order", async () => {
    const cart = await request("/api/ET/v1/cart/sample", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bundle: "family_lunch" })
    });
    assert(cart.response.status === 201, "Reject-order sample cart failed");
    const order = await request("/api/ET/v1/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ payment_method: "Cash", address_note: "Reject flow address", destination: { lat: 8.994, lng: 38.789 } })
    });
    assert(order.response.status === 201, "Reject-order placement failed");
    const rejected = await request(`/api/ET/v1/orders/${order.data.order.id}/status`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: JSON.stringify({ status: "rejected" })
    });
    assert(rejected.response.ok && rejected.data.order.status === "rejected", "Merchant reject order failed");
  });

  await step("driver accepts delivery and delivers order", async () => {
    const login = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "driver@habeshago.local", password: "Driver123!" })
    });
    assert(login.response.ok, "Driver login failed");
    driverToken = login.data.token;
    const requests = await request("/api/ET/v1/drivers/available-requests", {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const requestForOrder = (requests.data.requests || []).find((item) => item.order_id === flowOrderId);
    assert(requestForOrder, "Driver request for smoke order not found");
    const accept = await request("/api/ET/v1/drivers/accept-request", {
      method: "POST",
      headers: { Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ request_id: requestForOrder.id })
    });
    assert(accept.response.ok && accept.data.order.status === "driver_accepted", "Driver accept failed");
    const acceptAgain = await request("/api/ET/v1/drivers/accept-request", {
      method: "POST",
      headers: { Authorization: `Bearer ${driverToken}` },
      body: JSON.stringify({ request_id: requestForOrder.id })
    });
    assert(acceptAgain.response.ok && acceptAgain.data.already_accepted, "Driver accept should be idempotent for the assigned driver");
    const refreshedRequests = await request("/api/ET/v1/drivers/available-requests", {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert(!(refreshedRequests.data.requests || []).some((item) => item.id === requestForOrder.id), "Accepted driver request should not remain available");
    const activeOrders = await request("/api/ET/v1/drivers/me/orders", {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    assert((activeOrders.data.orders || []).some((order) => order.id === flowOrderId && order.status === "driver_accepted"), "Accepted request did not move to active driver orders");
    for (const status of ["picked_up", "on_the_way", "delivered"]) {
      const update = await request(`/api/ET/v1/orders/${flowOrderId}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${driverToken}` },
        body: JSON.stringify({ status })
      });
      assert(update.response.ok && update.data.order.status === status, `Driver status ${status} failed`);
    }
  });

  await step("admin login works", async () => {
    const { response, data } = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@habeshago.local", password: "Admin123!" })
    });
    assert(response.ok, "Admin login failed");
    assert(data.user && data.user.role === "admin", "Admin login did not return admin role");
    adminToken = data.token;
  });

  await step("auth verification and reset placeholders work", async () => {
    const verify = await request("/api/ET/v1/auth/verify/send", {
      method: "POST",
      body: JSON.stringify({ email: "customer@habeshago.local" })
    });
    assert(verify.response.status === 201, "Verification placeholder failed");
    const reset = await request("/api/ET/v1/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ email: "customer@habeshago.local" })
    });
    assert(reset.response.status === 202, "Password reset placeholder failed");
  });

  await step("admin can create and read SMS logs", async () => {
    const smsBody = `HabeshaGo smoke SMS ${Date.now()}`;
    const create = await request("/api/ET/v1/sms/simulate", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        to: "+251900000002",
        template: "SMOKE_TEST",
        body: smsBody
      })
    });
    assert(create.response.status === 201, "Admin SMS simulation failed");
    const logs = await request("/api/ET/v1/admin/sms-messages", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(logs.response.ok, "Admin SMS logs failed");
    assert((logs.data.messages || []).some((message) => message.body === smsBody), "Created SMS log was not returned");
  });

  await step("wallet transactions are audited", async () => {
    const adjustment = await request("/api/ET/v1/wallet/admin-adjustment", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ user_id: "customer-1", amount: 25, reason: "smoke_wallet_audit" })
    });
    assert(adjustment.response.status === 201, "Wallet adjustment failed");
    const tx = await request("/api/ET/v1/admin/wallet-transactions", {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(tx.response.ok && (tx.data.transactions || []).some((item) => item.reason === "smoke_wallet_audit"), "Wallet audit transaction not found");
  });

  await step("production checklist is backend-driven", async () => {
    const checklist = await request("/api/ET/v1/production-checklist");
    assert(checklist.response.ok, "Production checklist failed");
    for (const area of ["auth", "database", "payments", "orders", "wallet", "map", "security", "deployment"]) {
      assert((checklist.data.items || []).some((item) => item.area === area), `Checklist missing ${area}`);
    }
  });

  await step("admin portal controls work", async () => {
    const [roles, providers, audit, support, commissions, pendingMerchants, pendingDrivers, refunds, safety, details] = await Promise.all([
      request("/api/ET/v1/admin/security-roles", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/payment-providers", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/audit-logs", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/support/tickets", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/commission-settings", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/merchants/pending", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/drivers/pending", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/refunds", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/safety-controls", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/details", { headers: { Authorization: `Bearer ${adminToken}` } })
    ]);
    assert(roles.response.ok && (roles.data.roles || []).length >= 4, "Admin security roles failed");
    assert(providers.response.ok && (providers.data.providers || []).length === 4, "Admin payment providers failed");
    assert(audit.response.ok && Array.isArray(audit.data.logs), "Admin audit logs failed");
    assert(support.response.ok && Array.isArray(support.data.tickets), "Admin support tickets failed");
    assert(commissions.response.ok && Array.isArray(commissions.data.settings), "Admin commission settings failed");
    assert(pendingMerchants.response.ok && Array.isArray(pendingMerchants.data.merchants), "Pending merchants failed");
    assert(pendingDrivers.response.ok && Array.isArray(pendingDrivers.data.drivers), "Pending drivers failed");
    assert(refunds.response.ok && Array.isArray(refunds.data.refunds), "Refunds failed");
    assert(safety.response.ok && Array.isArray(safety.data.controls), "Safety controls failed");
    assert(details.response.ok && Array.isArray(details.data.customers) && Array.isArray(details.data.users), "Admin customer search data failed");
    if ((pendingMerchants.data.merchants || []).length) {
      const merchant = pendingMerchants.data.merchants[0];
      const approved = await request(`/api/ET/v1/admin/merchants/${merchant.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: "open", verified: true })
      });
      assert(approved.response.ok && approved.data.merchant.verified === true, "Admin merchant approval failed");
    }
    if ((pendingDrivers.data.drivers || []).length) {
      const driver = pendingDrivers.data.drivers[0];
      const approved = await request(`/api/ET/v1/admin/drivers/${driver.id}/status`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ frozen: false, online: true, verification_status: "verified" })
      });
      assert(approved.response.ok && approved.data.driver.verification_status === "verified", "Admin driver approval failed");
    }
  });

  console.log("Smoke test complete.");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
