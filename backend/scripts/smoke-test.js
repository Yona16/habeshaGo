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
    assert(html.includes("paymentMethod"), "Customer checkout payment method is missing");
    assert(html.includes("savedAddressLabel"), "Customer saved address checkout field is missing");
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

  await step("configured live demo backend flow works", async () => {
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

  await step("sample cart can be created", async () => {
    const { response, data } = await request("/api/ET/v1/cart/sample", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bundle: "family_lunch" })
    });
    assert(response.status === 201, "Sample cart failed");
    assert((data.cart.items || []).length > 0, "Sample cart returned no items");
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
        price: 315,
        stock_quantity: 7,
        prep_time_minutes: 14
      })
    });
    assert(edited.response.ok && edited.data.product.price === 315 && edited.data.product.stock_quantity === 7, "Merchant edit product failed");
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
    const dispatch = await request(`/api/ET/v1/orders/${flowOrderId}/request-driver`, {
      method: "POST",
      headers: { Authorization: `Bearer ${merchantToken}` },
      body: "{}"
    });
    assert(dispatch.response.status === 201, "Merchant driver request failed");
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
    const requests = await request("/api/ET/v1/drivers/requests", {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const requestForOrder = (requests.data.requests || []).find((item) => item.order_id === flowOrderId);
    assert(requestForOrder, "Driver request for smoke order not found");
    const accept = await request(`/api/ET/v1/drivers/requests/${requestForOrder.id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${driverToken}` },
      body: "{}"
    });
    assert(accept.response.ok && accept.data.order.status === "driver_accepted", "Driver accept failed");
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
