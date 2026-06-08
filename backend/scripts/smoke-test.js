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

  await step("admin login works", async () => {
    const { response, data } = await request("/api/ET/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "admin@habeshago.local", password: "Admin123!" })
    });
    assert(response.ok, "Admin login failed");
    assert(data.user && data.user.role === "admin", "Admin login did not return admin role");
    adminToken = data.token;
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

  console.log("Smoke test complete.");
}

main().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exit(1);
});
