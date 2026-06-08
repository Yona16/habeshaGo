const state = {
  country: "ET",
  token: localStorage.getItem("hg_token") || "",
  user: JSON.parse(localStorage.getItem("hg_user") || "null"),
  products: [],
  merchants: [],
  events: null
};

const $ = (selector) => document.querySelector(selector);
const money = (amount, currency = "ETB") => `${Number(amount || 0).toLocaleString()} ${currency}`;
const demoAccounts = {
  customer: { email: "customer@habeshago.local", password: "Customer123!" },
  merchant: { email: "merchant@habeshago.local", password: "Merchant123!" },
  driver: { email: "driver@habeshago.local", password: "Driver123!" },
  admin: { email: "admin@habeshago.local", password: "Admin123!" }
};

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function connectEvents() {
  if (state.events) state.events.close();
  state.events = new EventSource(`/api/${state.country}/v1/events`);
  state.events.addEventListener("connected", () => {
    $("#liveStatus").textContent = "Connected";
  });
  ["order.created", "order.updated", "dispatch.requested", "dispatch.accepted", "menu.requested", "notification.created"].forEach((name) => {
    state.events.addEventListener(name, async (event) => {
      const data = JSON.parse(event.data);
      $("#lastEvent").textContent = `${data.type} at ${new Date(data.at).toLocaleTimeString()}`;
      if (data.type === "notification.created" && data.payload?.type === "food_ready") {
        toast(data.payload.title + ": " + data.payload.body);
      }
      await refreshAll();
    });
  });
  state.events.onerror = () => {
    $("#liveStatus").textContent = "Reconnecting...";
  };
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("hg_token", token);
  localStorage.setItem("hg_user", JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("hg_token");
  localStorage.removeItem("hg_user");
  renderSession();
}

function renderSession() {
  $("#sessionLabel").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not signed in";
  $("#logoutBtn").hidden = !state.user;
}

function setAuthMode(mode) {
  document.body.dataset.authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#authSubmit").textContent = mode === "signup" ? "Create account" : "Login";
  renderSignupRoleDetails();
}

function setRole(role) {
  document.body.dataset.authRole = role;
  $("#authRole").value = role;
  const demo = demoAccounts[role];
  if (demo && document.body.dataset.authMode !== "signup") {
    $("#authEmail").value = demo.email;
    $("#authPassword").value = demo.password;
  }
  if (role === "driver") $("#authName").value = "Local Driver";
  if (role === "merchant") $("#authName").value = "Local Merchant";
  if (role === "admin") $("#authName").value = "Local Admin";
  if (role === "customer") $("#authName").value = "Local Customer";
  renderSignupRoleDetails();
}

function renderSignupRoleDetails() {
  const role = $("#authRole").value;
  const mode = document.body.dataset.authMode;
  const details = {
    customer: ["Preferred address", "Landmark note", "Emergency contact", "Wallet/profile created automatically"],
    driver: ["Vehicle type", "Vehicle plate", "License number", "Assigned zone", "Emergency contact", "Verification/training status"],
    merchant: ["Business name", "Category", "Manager", "Merchant phone", "Opening hours", "Address", "Prep time", "Delivery radius", "Women-owned badge"],
    admin: ["Admin identity", "Country/city access", "Operational dashboard access", "Compliance and trust controls"]
  };
  $("#signupRoleDetails").innerHTML = `
    <strong>${mode === "signup" ? "Signup details for" : "Login as"} ${role}</strong>
    <ul>${(details[role] || []).map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function activateRoleTab(role) {
  const view = role === "customer" ? "customer" : role;
  const tabButton = document.querySelector(`[data-view="${view}"]`);
  if (!tabButton) return;
  document.querySelectorAll(".tab, .view").forEach((el) => el.classList.remove("active"));
  tabButton.classList.add("active");
  $(`#${view}`).classList.add("active");
}

async function login(event) {
  event.preventDefault();
  const email = $("#authEmail").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  const data = await api(`/api/${state.country}/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setSession(data.token, data.user);
  toast(`Logged in as ${data.user.role}`);
  activateRoleTab(data.user.role);
  await refreshAll();
}

async function register(event) {
  event.preventDefault();
  const role = $("#authRole").value;
  const payload = {
    role,
    name: $("#authName").value,
    email: $("#authEmail").value.trim().toLowerCase(),
    phone: $("#authPhone").value,
    password: $("#authPassword").value,
    business_name: $("#authBusiness").value,
    category: $("#authMerchantCategory").value,
    manager_name: $("#authManagerName").value,
    merchant_phone: $("#authMerchantPhone").value,
    opening_hours: $("#authOpeningHours").value,
    merchant_address: $("#authMerchantAddress").value,
    prep_time_minutes: Number($("#authPrepTime").value),
    delivery_radius_km: Number($("#authDeliveryRadius").value),
    women_owned: $("#authWomenOwned").checked,
    preferred_address: $("#authAddress").value,
    landmark_note: $("#authLandmark").value,
    vehicle_type: $("#authVehicleType").value,
    vehicle_plate: $("#authVehiclePlate").value,
    license_number: $("#authLicense").value,
    assigned_zone: $("#authZone").value,
    emergency_contact_name: $("#authEmergencyName").value,
    emergency_contact_phone: $("#authEmergencyPhone").value,
    city_id: "bole",
    language: "en"
  };
  const data = await api(`/api/${state.country}/v1/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setSession(data.token, data.user);
  toast(`Created ${data.user.role} account`);
  activateRoleTab(data.user.role);
  await refreshAll();
}

async function submitAuth(event) {
  if (document.body.dataset.authMode === "signup") return register(event);
  return login(event);
}

async function loadCatalog() {
  const [lat, lng] = ($("#nearbyLocation")?.value || "8.994|38.789").split("|");
  const radius = $("#nearbyRadius")?.value || 5;
  const minRating = $("#minRating")?.value || 0;
  const sort = $("#merchantSort")?.value || "nearest";
  const category = encodeURIComponent($("#merchantCategory")?.value || "");
  const search = encodeURIComponent($("#merchantSearch")?.value || "");
  const merchants = await api(`/api/${state.country}/v1/merchants?lat=${lat}&lng=${lng}&radius_km=${radius}&min_rating=${minRating}&sort=${sort}&category=${category}&search=${search}`);
  const products = await api(`/api/${state.country}/v1/products`);
  state.merchants = merchants.merchants;
  state.products = products.products;
  renderMerchants();
  await loadNearbyMap();
}

function detail(label, value) {
  return `<div class="detail"><span>${label}</span><strong>${value || "Not set"}</strong></div>`;
}

function renderMerchantDetails() {
  $("#merchantDetails").innerHTML = state.merchants.map((merchant) => [
    detail("Merchant", merchant.name),
    detail("Manager", merchant.manager_name),
    detail("Phone", merchant.contact_phone),
    detail("Hours", merchant.opening_hours),
    detail("Prep time", `${merchant.prep_time_minutes || 20} min`),
    detail("Radius", `${merchant.delivery_radius_km || 3} km`),
    detail("Trust score", merchant.trust_score),
    detail("Verification", merchant.verification_status),
    detail("Notes", merchant.support_notes)
  ].join("")).join("");
}

async function loadProfiles() {
  if (!state.token) {
    $("#customerProfile").innerHTML = "";
    $("#driverProfile").innerHTML = "";
    return;
  }
  try {
    const data = await api(`/api/${state.country}/v1/profile/details`);
    const { user, customer, driver, merchant } = data.profile;
    $("#customerProfile").innerHTML = customer ? [
      detail("Customer", user.name),
      detail("Phone", user.phone),
      detail("Preferred address", customer.preferred_address),
      detail("Landmark note", customer.landmark_note),
      detail("Emergency contact", `${customer.emergency_contact_name || ""} ${customer.emergency_contact_phone || ""}`.trim()),
      detail("Support preference", customer.support_preference),
      detail("Wallet", money(customer.wallet_balance, customer.currency))
    ].join("") : "";
    $("#driverProfile").innerHTML = driver ? [
      detail("Driver", user.name),
      detail("Phone", user.phone),
      detail("Vehicle", `${driver.vehicle_type || ""} ${driver.vehicle_plate || ""}`.trim()),
      detail("License", driver.license_number),
      detail("Zone", driver.assigned_zone),
      detail("Emergency contact", `${driver.emergency_contact_name || ""} ${driver.emergency_contact_phone || ""}`.trim()),
      detail("Verification", driver.verification_status),
      detail("Training", driver.training_status),
      detail("Safety score", driver.safety_score)
    ].join("") : "";
    $("#merchantProfile").innerHTML = merchant ? [
      detail("Merchant", merchant.name),
      detail("Manager", merchant.manager_name),
      detail("Phone", merchant.contact_phone),
      detail("Hours", merchant.opening_hours),
      detail("Trust score", merchant.trust_score),
      detail("Payout schedule", merchant.payout_schedule),
      detail("Support notes", merchant.support_notes)
    ].join("") : "";
  } catch {
    $("#customerProfile").innerHTML = "";
    $("#driverProfile").innerHTML = "";
    $("#merchantProfile").innerHTML = "";
  }
}

function renderMerchants() {
  $("#merchantList").innerHTML = state.merchants.map((merchant) => {
    const products = state.products.filter((product) => product.merchant_id === merchant.id);
    return `
      <article class="card">
        <h3>${merchant.name}</h3>
        <p>${merchant.category} - ${merchant.rating} rating - ${merchant.review_count || 0} reviews - ${merchant.distance_km ?? "?"} km</p>
        <div>
          ${merchant.women_owned ? '<span class="badge">Almaz</span>' : ""}
          ${merchant.verified ? '<span class="badge">Verified</span>' : ""}
          <span class="badge">${merchant.city_id}</span>
        </div>
        ${products.map((product) => `
          <div class="product">
            <span>
              ${product.name}<br>
              <small>${product.description || ""}</small><br>
              <small>${money(product.price, product.currency)} - ${product.prep_time_minutes || 15} min - stock ${product.stock_quantity ?? "n/a"}${product.popular ? " - popular" : ""}</small><br>
              <small>${(product.dietary_tags || []).join(", ")}</small>
            </span>
            <button data-add="${product.id}">Add</button>
          </div>
        `).join("")}
      </article>
    `;
  }).join("");
  renderMerchantDetails();

  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => addToCart(button.dataset.add));
  });
}

async function addToCart(productId) {
  if (!state.user) return toast("Login as customer first");
  await api(`/api/${state.country}/v1/cart/items`, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, quantity: 1 })
  });
  toast("Added to cart");
  await renderCart();
}

async function addSampleCart(bundle) {
  if (!state.user) return toast("Login as customer first");
  await api(`/api/${state.country}/v1/cart/sample`, {
    method: "POST",
    body: JSON.stringify({ bundle })
  });
  toast("Sample cart added");
  await renderCart();
}

async function sendMenuRequest() {
  if (!state.user) return toast("Login as customer first");
  const merchant = state.merchants[0];
  await api(`/api/${state.country}/v1/menu-requests`, {
    method: "POST",
    body: JSON.stringify({
      merchant_id: merchant.id,
      item_name: $("#menuRequestName").value,
      note: $("#menuRequestNote").value
    })
  });
  toast("Menu request sent to merchant");
  await refreshAll();
}

async function renderCart() {
  if (!state.token) {
    $("#cartList").innerHTML = "<p>Login to use cart.</p>";
    return;
  }
  try {
    const data = await api(`/api/${state.country}/v1/cart`);
    const items = data.cart.items || [];
    if (!items.length) {
      $("#cartList").innerHTML = "<p>Cart is empty.</p>";
      return;
    }
    const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    $("#cartList").innerHTML = `
      ${items.map((item) => `<div class="cart-row"><span>${item.quantity} x ${item.name}</span><strong>${money(item.quantity * item.unit_price, item.currency)}</strong></div>`).join("")}
      <div class="cart-row"><span>Subtotal</span><strong>${money(total)}</strong></div>
    `;
  } catch {
    $("#cartList").innerHTML = "<p>Login as customer to use cart.</p>";
  }
}

async function placeOrder() {
  if (!state.user) return toast("Login as customer first");
  const data = await api(`/api/${state.country}/v1/orders`, {
    method: "POST",
    body: JSON.stringify({
      payment_method: "cash",
      address_note: $("#addressNote").value,
      safety_mode: $("#safetyMode").value,
      community_delivery: $("#communityDelivery").checked,
      destination: { lat: Number($("#destLat").value), lng: Number($("#destLng").value) }
    })
  });
  toast(`Order placed: ${data.order.id.slice(0, 8)}`);
  await refreshAll();
}

function table(rows, columns, actions = () => "") {
  if (!rows.length) return "<div class='card'>No records yet.</div>";
  return `
    <table>
      <thead><tr>${columns.map((col) => `<th>${col.label}</th>`).join("")}<th>Actions</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${columns.map((col) => `<td>${col.render ? col.render(row) : row[col.key]}</td>`).join("")}
            <td>${actions(row)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function simulatePayment(orderId, provider = "Cash") {
  await api(`/api/${state.country}/v1/payments/simulate`, {
    method: "POST",
    body: JSON.stringify({ order_id: orderId, provider })
  });
  toast(`Dummy ${provider} payment recorded`);
  await refreshAll();
}

async function loadOrders() {
  if (!state.token) {
    $("#customerOrders").innerHTML = "<div class='card'>Login to view orders.</div>";
    $("#merchantOrders").innerHTML = "<div class='card'>Login to view orders.</div>";
    $("#driverOrders").innerHTML = "<div class='card'>Login to view orders.</div>";
    $("#adminOrders").innerHTML = "<div class='card'>Login as admin.</div>";
    return;
  }
  let orders = [];
  if (state.user.role === "admin") {
    orders = (await api(`/api/${state.country}/v1/admin/orders`)).orders;
  } else {
    orders = (await api(`/api/${state.country}/v1/orders`)).orders;
  }
  const cols = [
    { label: "Order", render: (o) => o.id.slice(0, 8) },
    { label: "Status", key: "status" },
    { label: "Merchant", key: "merchant_name" },
    { label: "Customer", render: (o) => `${o.customer_name || ""}<br><small>${o.customer_phone || ""}</small>` },
    { label: "Driver", render: (o) => o.driver_name ? `${o.driver_name}<br><small>${o.driver_vehicle}</small>` : "Not assigned" },
    { label: "Total", render: (o) => money(o.total, o.currency) },
    { label: "Payment", render: (o) => o.payment_detail ? `${o.payment_detail.provider}<br><small>${o.payment_detail.status}</small>` : (o.payment_status || "pending") },
    { label: "Timeline", render: (o) => (o.status_history || []).map((h) => h.status).join(" -> ") },
    { label: "Address", render: (o) => `${o.address_note}<br><small>${o.map_quote ? `${o.map_quote.distance_km} km / ${o.map_quote.eta_minutes} min` : ""}</small>` }
  ];
  $("#customerOrders").innerHTML = table(orders, cols);
  $("#merchantOrders").innerHTML = table(orders, cols, (o) => merchantActions(o));
  $("#driverOrders").innerHTML = table(orders.filter((o) => ["driver_accepted", "picked_up"].includes(o.status)), cols, (o) => driverActions(o));
  $("#adminOrders").innerHTML = table(orders, cols, (o) => `<button data-pay="${o.id}|Cash">Dummy cash</button> <button class="secondary" data-pay="${o.id}|Chapa">Dummy Chapa</button> <button class="danger" data-status="${o.id}|cancelled">Cancel</button>`);
  bindStatusButtons();
}

function merchantActions(order) {
  if (order.status === "placed") return `<button data-status="${order.id}|accepted">Accept</button> <button class="danger" data-status="${order.id}|rejected">Reject</button>`;
  if (order.status === "accepted") return `<button data-status="${order.id}|preparing">Prepare</button>`;
  if (order.status === "preparing") return `<button data-status="${order.id}|ready_for_pickup">Ready</button>`;
  if (order.status === "ready_for_pickup") return `<button data-dispatch="${order.id}">Request driver</button>`;
  return "";
}

function driverActions(order) {
  if (order.status === "driver_accepted") return `<button data-status="${order.id}|picked_up">Picked up</button>`;
  if (order.status === "picked_up") return `<button data-status="${order.id}|delivered">Delivered</button>`;
  return "";
}

function bindStatusButtons() {
  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [id, status] = button.dataset.status.split("|");
      await api(`/api/${state.country}/v1/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "local_web_test" })
      });
      toast(`Order moved to ${status}`);
      await refreshAll();
    });
  });
  document.querySelectorAll("[data-pay]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [id, provider] = button.dataset.pay.split("|");
      await simulatePayment(id, provider);
    });
  });
  document.querySelectorAll("[data-dispatch]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/${state.country}/v1/orders/${button.dataset.dispatch}/request-driver`, {
        method: "POST",
        body: JSON.stringify({ pickup_note: "Ready at merchant counter" })
      });
      toast("Driver request sent");
      await refreshAll();
    });
  });
  document.querySelectorAll("[data-accept-request]").forEach((button) => {
    button.addEventListener("click", async () => {
      await api(`/api/${state.country}/v1/drivers/requests/${button.dataset.acceptRequest}/accept`, { method: "POST", body: "{}" });
      toast("Driver request accepted");
      await refreshAll();
    });
  });
}

async function loadMenuRequests() {
  if (!state.token || !["merchant", "admin", "customer"].includes(state.user.role)) {
    $("#merchantMenuRequests").innerHTML = "<div class='card'>Login to view menu requests.</div>";
    return;
  }
  try {
    const data = await api(`/api/${state.country}/v1/menu-requests`);
    $("#merchantMenuRequests").innerHTML = table(data.requests, [
      { label: "Request", render: (r) => r.id.slice(0, 8) },
      { label: "Item", key: "item_name" },
      { label: "Note", key: "note" },
      { label: "Status", key: "status" }
    ]);
  } catch {
    $("#merchantMenuRequests").innerHTML = "<div class='card'>Login as merchant or admin.</div>";
  }
}

async function loadDriverRequests() {
  if (!state.token || !["driver", "admin"].includes(state.user.role)) {
    $("#driverRequests").innerHTML = "<div class='card'>Login as driver to view requests.</div>";
    return;
  }
  const data = await api(`/api/${state.country}/v1/drivers/requests`);
  $("#driverRequests").innerHTML = table(data.requests, [
    { label: "Request", render: (r) => r.id.slice(0, 8) },
    { label: "Order", render: (r) => r.order_id.slice(0, 8) },
    { label: "ETA", render: (r) => `${r.eta_minutes} min` },
    { label: "Fee", render: (r) => money(r.delivery_fee, r.currency) },
    { label: "Status", key: "status" }
  ], (r) => `<button data-accept-request="${r.id}">Accept request</button>`);
  bindStatusButtons();
}

async function loadAdmin() {
  if (!state.token || state.user.role !== "admin") {
    $("#adminReports").innerHTML = "";
    $("#featureFlags").innerHTML = "<div class='card'>Login as admin to view operations.</div>";
    $("#paymentsPanel").innerHTML = "<div class='card'>Login as admin.</div>";
    $("#smsPanel").innerHTML = "<div class='card'>Login as admin.</div>";
    $("#compliancePanel").innerHTML = "";
    $("#adminDetails").innerHTML = "";
    $("#trustPanel").innerHTML = "<div class='card'>Login as admin.</div>";
    return;
  }
  const [reports, flags, payments, sms, compliance, details, trust] = await Promise.all([
    api(`/api/${state.country}/v1/admin/reports`),
    api(`/api/${state.country}/v1/feature-flags`),
    api(`/api/${state.country}/v1/admin/payment-transactions`),
    api(`/api/${state.country}/v1/admin/sms-messages`),
    api(`/api/${state.country}/v1/compliance/reviews`),
    api(`/api/${state.country}/v1/admin/details`),
    api(`/api/${state.country}/v1/admin/trust-verifications`)
  ]);
  $("#adminReports").innerHTML = [
    ["Orders", reports.orders_total],
    ["Completed", reports.orders_completed],
    ["Gross value", money(reports.gross_value)],
    ["Active merchants", reports.active_merchants],
    ["Cash issues", reports.unresolved_cash_reconciliation],
    ["Open support", reports.support_open],
    ["Dummy payments", reports.simulated_payments],
    ["SMS logs", reports.simulated_sms],
    ["Map quotes", reports.map_quotes],
    ["Legal holds", reports.legal_holds]
  ].map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("#featureFlags").innerHTML = flags.flags.map((flag) => `
    <div class="flag">
      <span>${flag.key}</span>
      <strong>${flag.enabled ? "Enabled" : flag.legal_hold ? "Legal hold" : "Disabled"}</strong>
    </div>
  `).join("");
  $("#paymentsPanel").innerHTML = table(payments.transactions, [
    { label: "Payment", render: (p) => p.id.slice(0, 8) },
    { label: "Provider", key: "provider" },
    { label: "Status", key: "status" },
    { label: "Amount", render: (p) => money(p.amount, p.currency) },
    { label: "Real money", render: (p) => p.real_money_moved ? "Yes" : "No" }
  ]);
  $("#smsPanel").innerHTML = table(sms.messages, [
    { label: "SMS", render: (m) => m.id.slice(0, 8) },
    { label: "To", key: "to" },
    { label: "Template", key: "template" },
    { label: "Status", key: "status" },
    { label: "Body", key: "body" }
  ]);
  $("#compliancePanel").innerHTML = compliance.reviews.map((review) => `
    <article class="card">
      <h3>${review.area}</h3>
      <p>${review.note}</p>
      <span class="badge">${review.status}</span>
      ${review.legal_hold ? '<span class="badge">Legal hold</span>' : '<span class="badge">Local demo allowed</span>'}
    </article>
  `).join("");
  $("#adminDetails").innerHTML = [
    detail("Countries", details.countries.length),
    detail("Cities", details.cities.length),
    detail("Merchants", details.merchants.length),
    detail("Products", details.products.length),
    detail("Drivers", details.drivers.length),
    detail("Customers", details.customers.length),
    detail("Compliance reviews", details.compliance_reviews.length),
    detail("Trust checks", details.trust_verifications.length)
  ].join("");
  $("#trustPanel").innerHTML = table(trust.verifications, [
    { label: "Entity", render: (v) => `${v.entity_type}<br><small>${v.entity_id}</small>` },
    { label: "Status", key: "status" },
    { label: "Score", key: "score" },
    { label: "Note", key: "note" }
  ]);
}

async function loadMetrics() {
  const health = await api("/health");
  $("#metrics").innerHTML = `
    <div class="metric"><strong>${health.countries}</strong><span>Countries configured</span></div>
    <div class="metric"><strong>${health.orders}</strong><span>Orders stored locally</span></div>
    <div class="metric"><strong>ETB</strong><span>Bole pilot currency</span></div>
    <div class="metric"><strong>8</strong><span>Feature flags protected</span></div>
  `;
}

async function loadRecommendations() {
  const data = await api(`/api/${state.country}/v1/recommendations`);
  $("#recommendations").innerHTML = data.recommendations.map((item) => `
    <article class="recommendation priority-${item.priority}">
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
      <span class="badge">${item.area}</span>
      <span class="badge">${item.priority}</span>
    </article>
  `).join("");
}

async function loadNearbyMap() {
  const [lat, lng] = ($("#nearbyLocation")?.value || "8.994|38.789").split("|");
  const radius = $("#nearbyRadius")?.value || 5;
  const restaurantData = await api(`/api/${state.country}/v1/merchants?lat=${lat}&lng=${lng}&radius_km=${radius}&category=restaurant&sort=nearest`);
  const cafeData = await api(`/api/${state.country}/v1/merchants?lat=${lat}&lng=${lng}&radius_km=${radius}&category=cafe&sort=nearest`);
  const supermarketData = await api(`/api/${state.country}/v1/merchants?lat=${lat}&lng=${lng}&radius_km=${radius}&category=supermarket&sort=nearest`);
  const driverData = await api(`/api/${state.country}/v1/drivers/available?lat=${lat}&lng=${lng}&radius_km=${radius}`);
  const merchants = [...restaurantData.merchants, ...cafeData.merchants, ...supermarketData.merchants].slice(0, 6);
  $("#nearbyRestaurants").innerHTML = `
    <h3>Nearby restaurants, cafes, supermarkets</h3>
    ${merchants.length ? merchants.map((merchant) => `
      <article class="map-marker restaurant">
        <strong>${merchant.name}</strong>
        <span>${merchant.category} - ${merchant.distance_km} km - ${merchant.rating} rating - ${merchant.review_count || 0} reviews</span>
        <span>${merchant.address_note}</span>
      </article>
    `).join("") : "<article class='map-marker restaurant'><strong>No nearby merchants</strong><span>Try increasing radius.</span></article>"}
  `;
  $("#nearbyDrivers").innerHTML = `
    <h3>Nearby drivers</h3>
    ${driverData.drivers.length ? driverData.drivers.slice(0, 6).map((driver) => `
      <article class="map-marker driver">
        <strong>${driver.badge_level || "Driver"} - ${driver.vehicle_type}</strong>
        <span>${driver.distance_km} km away - ${driver.eta_minutes} min ETA - safety ${driver.safety_score}</span>
        <span>Zone ${driver.assigned_zone} - plate ${driver.vehicle_plate || "not set"}</span>
      </article>
    `).join("") : "<article class='map-marker driver'><strong>No nearby drivers</strong><span>Try increasing radius.</span></article>"}
  `;
}

async function loadNotifications() {
  if (!state.token) {
    $("#notifications").innerHTML = "<div class='card'>Login to see order notifications.</div>";
    return;
  }
  try {
    const data = await api(`/api/${state.country}/v1/notifications`);
    const notifications = data.notifications || [];
    $("#notifications").innerHTML = notifications.length ? notifications.slice(0, 8).map((item) => `
      <article class="notification-item ${item.type}">
        <strong>${item.title}</strong>
        <p>${item.body}</p>
        <span>${new Date(item.created_at).toLocaleString()}${item.order_id ? ` - order ${item.order_id.slice(0, 8)}` : ""}</span>
      </article>
    `).join("") : "<div class='card'>No notifications yet. Place an order, then mark it ready from Merchant Portal.</div>";
  } catch {
    $("#notifications").innerHTML = "<div class='card'>Login to see order notifications.</div>";
  }
}

async function adjustWallet() {
  if (!state.user || state.user.role !== "admin") return toast("Login as admin first");
  const amount = Number($("#walletAmount").value);
  const data = await api(`/api/${state.country}/v1/wallet/admin-adjustment`, {
    method: "POST",
    body: JSON.stringify({ user_id: "customer-1", amount, reason: "local_web_test" })
  });
  toast(`Wallet adjusted. New balance: ${money(data.balance)}`);
}

async function sendSampleSms() {
  if (!state.user) return toast("Login first");
  await api(`/api/${state.country}/v1/sms/simulate`, {
    method: "POST",
    body: JSON.stringify({
      to: "+251900000002",
      template: "LOCAL_TEST",
      body: "HabeshaGo simulated SMS: your order is being prepared."
    })
  });
  toast("Sample SMS logged");
  await refreshAll();
}

async function quoteMap() {
  const data = await api(`/api/${state.country}/v1/maps/quote`, {
    method: "POST",
    body: JSON.stringify({ destination: { lat: Number($("#destLat").value), lng: Number($("#destLng").value) } })
  });
  $("#mapQuote").textContent = `${data.quote.distance_km} km - ${data.quote.eta_minutes} min ETA - ${money(data.quote.fee)}`;
  toast("Map quote calculated");
  await loadMetrics();
}

async function loadDriver() {
  const data = await api(`/api/${state.country}/v1/drivers/available`);
  $("#driverPanel").innerHTML = data.drivers.map((driver) => `
    <article class="card">
      <strong>${driver.badge_level}</strong>
      <span>Safety ${driver.safety_score} - Float ${money(driver.float_balance)} - Cash ${money(driver.cash_collected)}</span>
    </article>
  `).join("");
}

async function refreshAll() {
  await loadMetrics();
  await loadRecommendations();
  await loadNotifications();
  await loadProfiles();
  await loadCatalog();
  await renderCart();
  await loadOrders();
  await loadMenuRequests();
  await loadDriverRequests();
  await loadAdmin();
  await loadDriver();
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab, .view").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    $(`#${button.dataset.view}`).classList.add("active");
  });
});

document.body.dataset.authMode = "login";
document.body.dataset.authRole = "customer";
document.querySelectorAll(".auth-tab").forEach((button) => {
  button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
});
$("#authRole").addEventListener("change", () => setRole($("#authRole").value));
document.querySelectorAll("[data-demo]").forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode("login");
    setRole(button.dataset.demo);
  });
});
$("#authForm").addEventListener("submit", (event) => submitAuth(event).catch((error) => toast(error.message)));
$("#logoutBtn").addEventListener("click", () => { clearSession(); refreshAll(); });
$("#placeOrderBtn").addEventListener("click", () => placeOrder().catch((error) => toast(error.message)));
$("#menuRequestBtn").addEventListener("click", () => sendMenuRequest().catch((error) => toast(error.message)));
$("#adjustWalletBtn").addEventListener("click", () => adjustWallet().catch((error) => toast(error.message)));
$("#sendSmsBtn").addEventListener("click", () => sendSampleSms().catch((error) => toast(error.message)));
$("#quoteMapBtn").addEventListener("click", () => quoteMap().catch((error) => toast(error.message)));
$("#refreshRecommendationsBtn").addEventListener("click", () => loadRecommendations().catch((error) => toast(error.message)));
$("#refreshNotificationsBtn").addEventListener("click", () => loadNotifications().catch((error) => toast(error.message)));
$("#refreshNearbyMapBtn").addEventListener("click", () => loadNearbyMap().catch((error) => toast(error.message)));
document.querySelectorAll("[data-sample-cart]").forEach((button) => {
  button.addEventListener("click", () => addSampleCart(button.dataset.sampleCart).catch((error) => toast(error.message)));
});
$("#applyDiscoveryBtn").addEventListener("click", () => loadCatalog().catch((error) => toast(error.message)));
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => refreshAll().catch((error) => toast(error.message))));

renderSession();
setAuthMode("login");
setRole("customer");
connectEvents();
refreshAll().catch((error) => toast(error.message));
