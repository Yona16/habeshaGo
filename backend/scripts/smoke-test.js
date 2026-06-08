const baseUrl = process.env.BASE_URL || "http://localhost:3000";

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

  await step("web app loads", async () => {
    const response = await fetch(`${baseUrl}/`);
    const html = await response.text();
    assert(response.ok, "Home page did not load");
    assert(html.includes("HabeshaGo"), "Home page did not include app name");
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

  await step("customer can place an order", async () => {
    const { response, data } = await request("/api/ET/v1/orders", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        payment_method: "cash",
        address_note: "Smoke test address near Bole",
        destination: { lat: 8.994, lng: 38.789 }
      })
    });
    assert(response.status === 201, "Order placement failed");
    assert(data.order && data.order.status === "placed", "Order was not placed");
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

  await step("admin portal controls work", async () => {
    const [roles, providers, audit, support, commissions, pendingMerchants, pendingDrivers, refunds, safety] = await Promise.all([
      request("/api/ET/v1/admin/security-roles", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/payment-providers", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/audit-logs", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/support/tickets", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/ET/v1/admin/commission-settings", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/merchants/pending", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/drivers/pending", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/refunds", { headers: { Authorization: `Bearer ${adminToken}` } }),
      request("/api/admin/safety-controls", { headers: { Authorization: `Bearer ${adminToken}` } })
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
  });

  console.log("Smoke test complete.");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
