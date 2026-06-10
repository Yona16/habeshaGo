const state = {
  country: "ET",
  token: localStorage.getItem("habeshago_token") || localStorage.getItem("hg_token") || "",
  user: JSON.parse(localStorage.getItem("habeshago_user") || localStorage.getItem("hg_user") || "null"),
  products: [],
  merchants: [],
  locations: null,
  map: null,
  mapLayers: [],
  events: null,
  lastApi: null
};

function resolveApiBaseUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000/api/ET/v1";
  return "https://api.habeshago.com/api/ET/v1";
}

const API_BASE_URL = resolveApiBaseUrl();
const $ = (selector) => document.querySelector(selector);
const money = (amount, currency = "ETB") => `${Number(amount || 0).toLocaleString()} ${currency}`;
const demoAccounts = {
  customer: { email: "customer@habeshago.local", password: "Customer123!" },
  merchant: { email: "merchant@habeshago.local", password: "Merchant123!" },
  driver: { email: "driver@habeshago.local", password: "Driver123!" },
  admin: { email: "admin@habeshago.local", password: "Admin123!" }
};

function setAuthStatus(message, type = "") {
  const el = $("#authStatus");
  if (!el) return;
  el.textContent = message;
  el.classList.remove("success", "error");
  if (type) el.classList.add(type);
}

function signupDefaults(role) {
  const stamp = `${Date.now()}`.slice(-7);
  return {
    name: `Local ${role[0].toUpperCase()}${role.slice(1)} ${stamp}`,
    email: `${role}-${stamp}@habeshago.local`,
    phone: `+2519${stamp.padStart(8, "0").slice(0, 8)}`,
    password: `${role[0].toUpperCase()}${role.slice(1)}123!`
  };
}

function apiUrl(path) {
  if (path.startsWith(API_BASE_URL)) return path;
  if (path.startsWith("http")) return path;
  let normalized = path;
  normalized = normalized.replace(/^\/api\/[^/]+\/v1/i, "");
  normalized = normalized.replace(/^\/api\/marketplace/i, "/marketplace");
  normalized = normalized.replace(/^\/api\/admin/i, "/admin");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return `${API_BASE_URL}${normalized}`;
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const url = apiUrl(path);
  const payload = options.body ? JSON.parse(options.body) : null;
  console.log("API URL:", url);
  console.log("Payload:", payload);
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  state.lastApi = { status: response.status, body: data, url };
  console.log("Status:", response.status);
  console.log("Response:", data);
  if (!response.ok) throw new Error(`Status ${response.status}: ${data.error || "Request failed"}`);
  return data;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}

function actionPanel() {
  let panel = $("#actionStatus");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "actionStatus";
    panel.className = "action-status";
    panel.hidden = true;
    document.body.appendChild(panel);
  }
  return panel;
}

function showActionStatus({ title, message, type = "", response = state.lastApi }) {
  const panel = actionPanel();
  panel.hidden = false;
  panel.className = `action-status ${type}`.trim();
  panel.innerHTML = `
    <strong>${title}</strong>
    <div>${message}</div>
    <div>Backend response status: ${response?.status ?? "No backend request yet"}</div>
    <pre>Backend response body: ${JSON.stringify(response?.body ?? {}, null, 2)}</pre>
  `;
}

async function runButtonAction(button, label, action) {
  const originalText = button?.textContent;
  try {
    if (button) {
      button.disabled = true;
      button.textContent = "Loading...";
    }
    showActionStatus({ title: label, message: "Loading...", response: null });
    const result = await action();
    showActionStatus({ title: label, message: "Success", type: "success" });
    toast(`${label}: success`);
    return result;
  } catch (error) {
    showActionStatus({ title: label, message: `Error: ${error.message}`, type: "error" });
    toast(error.message);
    throw error;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function addLiveLog(message) {
  const log = $("#liveEventLog");
  const item = document.createElement("div");
  item.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
  log.prepend(item);
  while (log.children.length > 20) log.removeChild(log.lastChild);
}

function updateTracker(status) {
  const order = ["placed", "accepted", "preparing", "ready_for_pickup", "driver_requested", "driver_accepted", "picked_up", "on_the_way", "delivered", "cancelled"];
  const index = order.indexOf(status);
  document.querySelectorAll("[data-track-status]").forEach((step) => {
    const stepIndex = order.indexOf(step.dataset.trackStatus);
    step.classList.toggle("active", stepIndex >= 0 && stepIndex <= index);
    step.classList.toggle("current", step.dataset.trackStatus === status);
  });
}

function connectEvents() {
  if (state.events) state.events.close();
  state.events = new EventSource(`${API_BASE_URL}/events`);
  state.events.addEventListener("connected", () => {
    $("#liveStatus").textContent = "Connected";
  });
  ["order.created", "order.updated", "dispatch.requested", "dispatch.accepted", "menu.requested", "notification.created", "driver.location.updated"].forEach((name) => {
    state.events.addEventListener(name, async (event) => {
      const data = JSON.parse(event.data);
      $("#lastEvent").textContent = `${data.type} at ${new Date(data.at).toLocaleTimeString()}`;
      if (data.type === "driver.location.updated") {
        addLiveLog(`Driver location: ${Number(data.payload.latitude).toFixed(5)}, ${Number(data.payload.longitude).toFixed(5)}`);
        await loadRealtimeLocations();
        return;
      }
      if (data.type === "order.updated" || data.type === "live.step") {
        const status = data.payload?.status;
        if (status) updateTracker(status);
        addLiveLog(`${data.payload?.step || data.type}: ${status || ""}`);
        if (data.payload?.order_id) $("#liveDemoSummary").textContent = `Live order ${data.payload.order_id.slice(0, 8)} is ${status || "moving"}.`;
      }
      if (data.type === "notification.created" && data.payload?.type === "food_ready") {
        toast(data.payload.title + ": " + data.payload.body);
        addLiveLog(`Notification: ${data.payload.title}`);
      }
      await refreshAll();
    });
  });
  state.events.onerror = () => {
    $("#liveStatus").textContent = "Reconnecting...";
  };
}

async function startLiveDemo() {
  $("#startLiveDemoBtn").disabled = true;
  $("#liveEventLog").innerHTML = "";
  updateTracker("");
  try {
    const demo = await api(`${API_BASE_URL}/live-demo/start`, { method: "POST", body: "{}" });
    setSession(demo.token, demo.user);
    addLiveLog(`Created and logged in ${demo.user.name}`);
    addLiveLog(`Loaded ${demo.catalog.merchants} merchants and ${demo.catalog.products} products`);
    addLiveLog(`Added ${demo.catalog.cart_items} item to cart and placed order`);
    addLiveLog(`Admin monitor: ${demo.admin_summary.orders_total} orders, ${demo.admin_summary.wallet_transactions} wallet tx, ${demo.admin_summary.audit_logs} audit logs`);
    const order = demo.order;
    updateTracker(order.status);
    $("#liveDemoSummary").textContent = `Live flow running: order ${order.id.slice(0, 8)} is ${order.status}.`;
    toast("Live demo started");
    for (let attempt = 0; attempt < 18; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      const loadedOrder = await api(`${API_BASE_URL}/orders/${order.id}`);
      updateTracker(loadedOrder.order.status);
      $("#liveDemoSummary").textContent = `Live order ${loadedOrder.order.id.slice(0, 8)} is ${loadedOrder.order.status}. Admin, wallet, merchant, and driver data are refreshing from backend.`;
      if (loadedOrder.order.status === "delivered") {
        addLiveLog("Order delivered. Admin dashboard reflects the full order and wallet ledger.");
        await refreshAll();
        break;
      }
    }
  } finally {
    setTimeout(() => { $("#startLiveDemoBtn").disabled = false; }, 1200);
  }
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("habeshago_token", token);
  localStorage.setItem("habeshago_user", JSON.stringify(user));
  localStorage.setItem("hg_token", token);
  localStorage.setItem("hg_user", JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("habeshago_token");
  localStorage.removeItem("habeshago_user");
  localStorage.removeItem("hg_token");
  localStorage.removeItem("hg_user");
  renderSession();
}

async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await api(`${API_BASE_URL}/auth/me`);
    state.user = data.user;
    localStorage.setItem("habeshago_user", JSON.stringify(data.user));
    localStorage.setItem("hg_user", JSON.stringify(data.user));
    renderSession();
  } catch {
    clearSession();
    setAuthStatus("Session expired. Please log in again.", "error");
  }
}

function renderSession() {
  $("#sessionLabel").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not signed in";
  $("#logoutBtn").hidden = !state.user;
}

function setAuthMode(mode) {
  document.body.dataset.authMode = mode;
  document.querySelectorAll(".auth-tab").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
  $("#authSubmit").textContent = mode === "signup" ? "Create account" : "Login";
  if (mode === "signup") {
    const defaults = signupDefaults($("#authRole").value);
    $("#authName").value = defaults.name;
    $("#authEmail").value = defaults.email;
    $("#authPhone").value = defaults.phone;
    $("#authPassword").value = defaults.password;
    setAuthStatus("Signup fields use a unique local email and phone so account creation will not collide with demo users.");
  } else {
    setRole($("#authRole").value);
    setAuthStatus("Login mode uses demo credentials. Choose a role or click a Demo button.");
  }
  renderSignupRoleDetails();
}

function setRole(role) {
  document.body.dataset.authRole = role;
  $("#authRole").value = role;
  const demo = demoAccounts[role];
  if (demo && document.body.dataset.authMode !== "signup") {
    $("#authEmail").value = demo.email;
    $("#authPassword").value = demo.password;
  } else if (document.body.dataset.authMode === "signup") {
    const defaults = signupDefaults(role);
    $("#authEmail").value = defaults.email;
    $("#authPhone").value = defaults.phone;
    $("#authPassword").value = defaults.password;
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
  window.location.hash = view;
}

async function refreshAfterAuth(role) {
  try {
    await refreshAll();
  } catch (error) {
    setAuthStatus(`${role} signed in. Some dashboard panels need refresh: ${error.message}`, "success");
    toast("Signed in. Refresh dashboard if a panel is still loading.");
  }
}

async function loginWithCredentials(email, password) {
  setAuthStatus("Signing in...");
  const data = await api(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if ($("#authRole").value === "admin" && data.user.role !== "admin") {
    throw new Error(`Expected admin role, received ${data.user.role}`);
  }
  setSession(data.token, data.user);
  setAuthStatus(`Signed in as ${data.user.name} (${data.user.role}). Token saved locally.`, "success");
  toast(`Logged in as ${data.user.role}`);
  activateRoleTab(data.user.role);
  await refreshAfterAuth(data.user.role);
}

async function login(event) {
  event.preventDefault();
  try {
    await loginWithCredentials($("#authEmail").value.trim().toLowerCase(), $("#authPassword").value);
  } catch (error) {
    setAuthStatus(`Login failed: ${error.message}`, "error");
    throw error;
  }
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
    city_id: "bole"
  };
  if (role === "driver") {
    Object.assign(payload, {
      vehicle_type: $("#authVehicleType").value,
      vehicle_plate: $("#authVehiclePlate").value,
      license_number: $("#authLicense").value,
      assigned_zone: $("#authZone").value
    });
  }
  if (role === "merchant") {
    Object.assign(payload, {
      business_name: $("#authBusiness").value,
      category: $("#authMerchantCategory").value,
      manager_name: $("#authManagerName").value,
      merchant_phone: $("#authMerchantPhone").value,
      merchant_address: $("#authMerchantAddress").value
    });
  }
  if (role === "customer") {
    Object.assign(payload, {
      preferred_address: $("#authAddress").value,
      landmark_note: $("#authLandmark").value
    });
  }
  if (role === "admin" && $("#authAdminSignupCode")) {
    payload.admin_signup_code = $("#authAdminSignupCode").value;
  }
  setAuthStatus("Creating account...");
  const data = await api(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  setSession(data.token, data.user);
  setAuthStatus(`Created ${data.user.name} (${data.user.role}). You are signed in.`, "success");
  toast(`Created ${data.user.role} account`);
  activateRoleTab(data.user.role);
  await refreshAfterAuth(data.user.role);
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
  const merchants = await api(`/api/marketplace/nearby?lat=${lat}&lng=${lng}&radiusKm=${radius}&minimumReview=${minRating}&sortBy=${sort}&type=${category}&search=${search}`);
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
    button.addEventListener("click", () => runButtonAction(button, "Add item to cart", () => addToCart(button.dataset.add)).catch(() => {}));
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
  const paymentMethod = $("#paymentMethod")?.value || "Cash";
  const promoCode = $("#promoCode")?.value.trim();
  const data = await api(`/api/${state.country}/v1/orders`, {
    method: "POST",
    body: JSON.stringify({
      payment_method: paymentMethod,
      promo_code: promoCode,
      address_label: $("#savedAddressLabel")?.value || "Bole delivery address",
      address_note: $("#addressNote").value,
      safety_mode: $("#safetyMode").value,
      community_delivery: $("#communityDelivery").checked,
      destination: { lat: Number($("#destLat").value), lng: Number($("#destLng").value) }
    })
  });
  if (paymentMethod !== "Cash") {
    await api(`/api/${state.country}/v1/payments/simulate`, {
      method: "POST",
      body: JSON.stringify({ order_id: data.order.id, provider: paymentMethod })
    });
  }
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
  if (order.status === "picked_up") return `<button data-status="${order.id}|on_the_way">On the way</button> <button data-status="${order.id}|delivered">Delivered</button>`;
  if (order.status === "on_the_way") return `<button data-status="${order.id}|delivered">Delivered</button>`;
  return "";
}

function bindStatusButtons() {
  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => runButtonAction(button, "Update order status", async () => {
      const [id, status] = button.dataset.status.split("|");
      await api(`/api/${state.country}/v1/orders/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, reason: "local_web_test" })
      });
      toast(`Order moved to ${status}`);
      await refreshAll();
    }).catch(() => {}));
  });
  document.querySelectorAll("[data-pay]").forEach((button) => {
    button.addEventListener("click", () => runButtonAction(button, "Record dummy payment", async () => {
      const [id, provider] = button.dataset.pay.split("|");
      await simulatePayment(id, provider);
    }).catch(() => {}));
  });
  document.querySelectorAll("[data-dispatch]").forEach((button) => {
    button.addEventListener("click", () => runButtonAction(button, "Request driver", async () => {
      await api(`/api/${state.country}/v1/orders/${button.dataset.dispatch}/request-driver`, {
        method: "POST",
        body: JSON.stringify({ pickup_note: "Ready at merchant counter" })
      });
      toast("Driver request sent");
      await refreshAll();
    }).catch(() => {}));
  });
  document.querySelectorAll("[data-accept-request]").forEach((button) => {
    button.addEventListener("click", () => runButtonAction(button, "Accept driver request", async () => {
      await api(`/api/${state.country}/v1/drivers/requests/${button.dataset.acceptRequest}/accept`, { method: "POST", body: "{}" });
      toast("Driver request accepted");
      await refreshAll();
    }).catch(() => {}));
  });
}

async function validatePromo() {
  if (!state.token) return toast("Login as customer first");
  const cart = await api(`/api/${state.country}/v1/cart`);
  const subtotal = (cart.cart.items || []).reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const data = await api(`/api/${state.country}/v1/promos/validate`, {
    method: "POST",
    body: JSON.stringify({ code: $("#promoCode").value, subtotal })
  });
  $("#customerToolsPanel").innerHTML = `<p>Promo ${data.promo.code}: discount ${money(data.discount)}. New subtotal ${money(data.final_subtotal)}.</p>`;
  toast("Promo validated");
}

async function saveCustomerAddress() {
  if (!state.token) return toast("Login as customer first");
  const data = await api(`/api/${state.country}/v1/addresses`, {
    method: "POST",
    body: JSON.stringify({
      label: $("#savedAddressLabel")?.value || "Bole delivery address",
      sub_city: "Bole",
      woreda: "03",
      neighborhood: "Medhanealem",
      landmark: $("#addressNote").value,
      delivery_instructions: "Call before arrival",
      lat: Number($("#destLat").value),
      lng: Number($("#destLng").value)
    })
  });
  $("#customerToolsPanel").innerHTML = `<p>Saved address: ${data.address.label}, ${data.address.neighborhood}, ${data.address.landmark}</p>`;
  toast("Address saved");
}

async function favoriteFirstMerchant() {
  if (!state.token) return toast("Login as customer first");
  const merchant = state.merchants[0];
  if (!merchant) return toast("No merchant loaded");
  await api(`/api/${state.country}/v1/favorites`, { method: "POST", body: JSON.stringify({ merchant_id: merchant.id }) });
  const data = await api(`/api/${state.country}/v1/favorites`);
  $("#customerToolsPanel").innerHTML = `<p>${data.favorites.length} favorite merchant${data.favorites.length === 1 ? "" : "s"} saved.</p>`;
  toast("Merchant favorited");
}

async function reviewFirstMerchant() {
  if (!state.token) return toast("Login as customer first");
  const merchant = state.merchants[0];
  if (!merchant) return toast("No merchant loaded");
  const data = await api(`/api/${state.country}/v1/reviews`, {
    method: "POST",
    body: JSON.stringify({ merchant_id: merchant.id, rating: 5, comment: "Great local demo experience." })
  });
  $("#customerToolsPanel").innerHTML = `<p>Reviewed ${data.merchant.name}. New rating ${data.merchant.rating} from ${data.merchant.review_count} reviews.</p>`;
  toast("Review saved");
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
  if (state.token) {
    await restoreSession();
  }
  if (!state.token || !state.user || state.user.role !== "admin") {
    $("#adminReports").innerHTML = "";
    $("#adminOrders").innerHTML = "<div class='card'>Login as admin to view all orders.</div>";
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
  $("#smsPanel").innerHTML = sms.messages.length ? table(sms.messages, [
    { label: "SMS", render: (m) => m.id.slice(0, 8) },
    { label: "To", key: "to" },
    { label: "Template", key: "template" },
    { label: "Status", key: "status" },
    { label: "Body", key: "body" }
  ]) : "<div class='card'>No SMS logs yet. Click Log Sample SMS or place an order to create a simulated SMS record.</div>";
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

async function loadProductionReadiness() {
  const report = await api(`/api/${state.country}/v1/production-readiness`);
  let gate;
  try {
    gate = await api(`/api/${state.country}/v1/launch-gate`);
  } catch {
    gate = state.lastApi?.body || { launch_allowed: false, mode: "local-demo", missing_environment: ["production gate blocked"] };
  }
  const checklist = await api(`/api/${state.country}/v1/production-checklist`);
  $("#productionReadinessSummary").innerHTML = `
    <strong>${report.score}/100 - ${report.production_ready ? "Production ready" : "Not production ready"}</strong>
    <p>${report.summary}</p>
    <p>${report.launch_recommendation}</p>
  `;
  $("#productionLaunchGate").innerHTML = `
    <div>
      <strong>${gate.launch_allowed ? "Launch gate passed" : "Launch gate blocking production"}</strong>
      <span>Mode: ${gate.mode || "local-demo"} - status: ${gate.launch_allowed ? "allowed" : "blocked"}</span>
      <p>${gate.launch_allowed ? "All required production checks are currently satisfied." : "This local app is usable for testing, but the production gate is intentionally blocking real customer launch."}</p>
    </div>
    <div>
      <strong>Missing production environment</strong>
      <p>${(gate.missing_environment || []).length ? gate.missing_environment.join(", ") : "No missing production environment values reported."}</p>
    </div>
    <div>
      <strong>Required launch actions</strong>
      <ul>${(gate.required_actions || []).map((item) => `<li>${item}</li>`).join("")}</ul>
    </div>
  `;
  $("#productionReadiness").innerHTML = report.checks.map((check) => `
    <div class="severity-${check.severity}">
      <strong>${check.area}</strong>
      <span>${check.status} - ${check.severity}</span>
      <p>${check.detail}</p>
    </div>
  `).join("") + checklist.items.map((item) => `
    <div class="severity-${item.status.includes("not") || item.status.includes("needs") || item.status.includes("dummy") ? "high" : "low"}">
      <strong>${item.area}</strong>
      <span>${item.status}</span>
      <p>${item.detail}</p>
    </div>
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
  await loadRealtimeLocations();
}

async function loadRealtimeLocations() {
  const [lat, lng] = ($("#nearbyLocation")?.value || "8.994|38.789").split("|");
  const data = await api(`/api/${state.country}/v1/locations/live?lat=${lat}&lng=${lng}`);
  state.locations = data;
  const drivers = data.drivers || [];
  const merchants = data.merchants || [];
  $("#realtimeMap").innerHTML = `
    <div class="map-dot customer" style="left:50%;top:50%"><span>You</span></div>
    ${merchants.slice(0, 5).map((merchant, index) => `
      <div class="map-dot merchant" style="left:${18 + index * 13}%;top:${28 + (index % 2) * 24}%"><span>${merchant.name}</span></div>
    `).join("")}
    ${drivers.slice(0, 5).map((driver, index) => `
      <div class="map-dot driver moving" style="left:${62 + index * 7}%;top:${26 + index * 11}%"><span>${driver.vehicle_type} ${driver.distance_km} km</span></div>
    `).join("")}
  `;
  $("#realtimeLocationPanel").innerHTML = `
    <strong>Real-time sample location</strong>
    <span>${data.provider} - ${drivers.length} online driver${drivers.length === 1 ? "" : "s"} - refreshed ${new Date().toLocaleTimeString()}</span>
    ${drivers.slice(0, 3).map((driver) => `
      <p>${driver.badge_level}: ${driver.latitude.toFixed(5)}, ${driver.longitude.toFixed(5)} - ${driver.eta_minutes} min ETA - accuracy ${driver.accuracy_m}m</p>
    `).join("")}
  `;
  renderLeafletMap(data);
}

function selectedMapOrigin() {
  const [lat, lng] = ($("#nearbyLocation")?.value || "8.994|38.789").split("|").map(Number);
  return { lat, lng };
}

function setMapNotice(message, type = "") {
  const notice = $("#mapNotice");
  if (!notice) return;
  notice.textContent = message;
  notice.className = `map-notice ${type}`.trim();
}

function mapIcon(label, color) {
  if (!window.L) return null;
  return L.divIcon({
    className: "leaflet-label-marker",
    html: `<span style="background:${color}">${label}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16]
  });
}

function renderLeafletMap(data) {
  const mapEl = $("#leafletMap");
  if (!mapEl || !window.L) {
    if (mapEl) mapEl.innerHTML = "<div class='map-fallback'>OpenStreetMap is unavailable. Showing local marker fallback.</div>";
    setMapNotice("OpenStreetMap/Leaflet is unavailable. Showing the local fallback marker overlay.", "warning");
    return;
  }
  const origin = data.origin || selectedMapOrigin();
  setMapNotice(`OpenStreetMap active. Customer location ${Number(origin.lat).toFixed(4)}, ${Number(origin.lng).toFixed(4)} with merchants, radius, and live driver markers.`);
  if (!state.map) {
    state.map = L.map("leafletMap", { zoomControl: true }).setView([origin.lat, origin.lng], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.map);
    setTimeout(() => state.map.invalidateSize(), 150);
  }
  state.map.setView([origin.lat, origin.lng], 15);
  state.mapLayers.forEach((layer) => state.map.removeLayer(layer));
  state.mapLayers = [];
  const addLayer = (layer) => {
    state.mapLayers.push(layer);
    layer.addTo(state.map);
  };
  addLayer(L.marker([origin.lat, origin.lng], { icon: mapIcon("You", "#0f5132") }).bindPopup("Customer location"));
  addLayer(L.circle([origin.lat, origin.lng], {
    radius: Number($("#nearbyRadius")?.value || 5) * 1000,
    color: "#0f5132",
    fillColor: "#0f5132",
    fillOpacity: 0.06
  }).bindPopup(`Delivery radius: ${$("#nearbyRadius")?.value || 5} km`));
  (data.merchants || []).slice(0, 8).forEach((merchant) => {
    addLayer(L.marker([merchant.latitude, merchant.longitude], { icon: mapIcon("Shop", "#b97818") }).bindPopup(`${merchant.name}<br>${merchant.category} - ${merchant.distance_km} km<br>${merchant.address_note || ""}`));
  });
  (data.drivers || []).slice(0, 8).forEach((driver) => {
    addLayer(L.circleMarker([driver.latitude, driver.longitude], {
      radius: 8,
      color: "#236cb3",
      fillColor: "#236cb3",
      fillOpacity: 0.85
    }).bindPopup(`Live driver later<br>${driver.vehicle_type} ${driver.vehicle_plate || ""}<br>${driver.distance_km} km - ${driver.eta_minutes} min ETA`));
  });
}

async function refreshGpsAndMap() {
  if (!navigator.geolocation) {
    setMapNotice("GPS is not available in this browser. Using selected customer fallback location.", "warning");
    return loadNearbyMap();
  }
  setMapNotice("Requesting GPS permission. If denied, HabeshaGo will keep using the selected fallback location.", "warning");
  $("#realtimeLocationPanel").innerHTML = "<strong>Refreshing GPS...</strong><span>Waiting for browser location or fallback.</span>";
  let gpsDenied = false;
  await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        $("#nearbyLocation").value = "8.994|38.789";
        $("#destLat").value = position.coords.latitude.toFixed(4);
        $("#destLng").value = position.coords.longitude.toFixed(4);
        setMapNotice(`GPS shared. Customer marker updated from browser location ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}.`);
        resolve();
      },
      (error) => {
        gpsDenied = true;
        const reason = error?.code === 1 ? "GPS permission denied" : "GPS unavailable";
        setMapNotice(`${reason}. Using selected customer fallback location and still showing nearby merchants, delivery radius, and driver markers.`, "error");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 2500, maximumAge: 60000 }
    );
  });
  if (gpsDenied) $("#realtimeLocationPanel").innerHTML = "<strong>GPS fallback active</strong><span>Permission was denied or unavailable. Showing selected customer location with OpenStreetMap markers.</span>";
  await loadNearbyMap();
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
  if (state.token) await restoreSession();
  await loadMetrics();
  await loadRecommendations();
  await loadProductionReadiness();
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
  button.addEventListener("click", () => runButtonAction(button, `Open ${button.dataset.view} view`, async () => {
    document.querySelectorAll(".tab, .view").forEach((el) => el.classList.remove("active"));
    button.classList.add("active");
    $(`#${button.dataset.view}`).classList.add("active");
    window.location.hash = button.dataset.view;
    if (button.dataset.view === "admin") await loadAdmin();
  }).catch(() => {}));
});

document.body.dataset.authMode = "login";
document.body.dataset.authRole = "customer";
document.querySelectorAll(".auth-tab").forEach((button) => {
  button.addEventListener("click", () => runButtonAction(button, `Switch to ${button.dataset.authMode}`, async () => setAuthMode(button.dataset.authMode)).catch(() => {}));
});
$("#authRole").addEventListener("change", () => setRole($("#authRole").value));
document.querySelectorAll("[data-demo]").forEach((button) => {
  button.addEventListener("click", () => {
    setAuthMode("login");
    setRole(button.dataset.demo);
    const demo = demoAccounts[button.dataset.demo];
    if (demo) runButtonAction(button, `Demo ${button.dataset.demo} login`, () => loginWithCredentials(demo.email, demo.password)).catch(() => {});
  });
});
$("#authForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runButtonAction($("#authSubmit"), document.body.dataset.authMode === "signup" ? "Create account" : "Login", () => submitAuth(event)).catch(() => {});
});
$("#logoutBtn").addEventListener("click", () => runButtonAction($("#logoutBtn"), "Logout", async () => { clearSession(); await refreshAll(); }).catch(() => {}));
$("#placeOrderBtn").addEventListener("click", () => runButtonAction($("#placeOrderBtn"), "Place order", placeOrder).catch(() => {}));
$("#menuRequestBtn").addEventListener("click", () => runButtonAction($("#menuRequestBtn"), "Send menu request", sendMenuRequest).catch(() => {}));
$("#adjustWalletBtn").addEventListener("click", () => runButtonAction($("#adjustWalletBtn"), "Adjust wallet", adjustWallet).catch(() => {}));
$("#sendSmsBtn").addEventListener("click", () => runButtonAction($("#sendSmsBtn"), "Log sample SMS", sendSampleSms).catch(() => {}));
$("#quoteMapBtn").addEventListener("click", () => runButtonAction($("#quoteMapBtn"), "Get map quote", quoteMap).catch(() => {}));
$("#validatePromoBtn").addEventListener("click", () => runButtonAction($("#validatePromoBtn"), "Validate promo", validatePromo).catch(() => {}));
$("#saveAddressBtn").addEventListener("click", () => runButtonAction($("#saveAddressBtn"), "Save address", saveCustomerAddress).catch(() => {}));
$("#favoriteMerchantBtn").addEventListener("click", () => runButtonAction($("#favoriteMerchantBtn"), "Favorite merchant", favoriteFirstMerchant).catch(() => {}));
$("#reviewMerchantBtn").addEventListener("click", () => runButtonAction($("#reviewMerchantBtn"), "Review merchant", reviewFirstMerchant).catch(() => {}));
$("#startLiveDemoBtn").addEventListener("click", () => runButtonAction($("#startLiveDemoBtn"), "Run live end-to-end demo", startLiveDemo).catch(() => {
  $("#startLiveDemoBtn").disabled = false;
}));
$("#refreshRecommendationsBtn").addEventListener("click", () => runButtonAction($("#refreshRecommendationsBtn"), "Refresh recommendations", loadRecommendations).catch(() => {}));
$("#refreshReadinessBtn").addEventListener("click", () => runButtonAction($("#refreshReadinessBtn"), "Refresh production readiness", loadProductionReadiness).catch(() => {}));
$("#refreshNotificationsBtn").addEventListener("click", () => runButtonAction($("#refreshNotificationsBtn"), "Refresh notifications", loadNotifications).catch(() => {}));
$("#refreshNearbyMapBtn").addEventListener("click", () => runButtonAction($("#refreshNearbyMapBtn"), "Refresh nearby map", refreshGpsAndMap).catch(() => {}));
document.querySelectorAll("[data-sample-cart]").forEach((button) => {
  button.addEventListener("click", () => runButtonAction(button, "Add sample cart", () => addSampleCart(button.dataset.sampleCart)).catch(() => {}));
});
$("#applyDiscoveryBtn").addEventListener("click", () => runButtonAction($("#applyDiscoveryBtn"), "Apply nearby discovery", loadCatalog).catch(() => {}));
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => runButtonAction(button, "Refresh dashboard", refreshAll).catch(() => {})));

renderSession();
setAuthMode("login");
setRole("customer");
connectEvents();
restoreSession()
  .then(() => refreshAll())
  .catch((error) => toast(error.message));
