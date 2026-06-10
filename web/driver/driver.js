const state = {
  country: "ET",
  token: localStorage.getItem("hg_driver_token") || localStorage.getItem("habeshago_token") || "",
  user: JSON.parse(localStorage.getItem("hg_driver_user") || localStorage.getItem("habeshago_user") || "null"),
  requests: [],
  orders: [],
  wallet: null,
  profile: null,
  lastApi: null,
  map: null,
  layers: [],
  activeOrder: null,
  movementTimer: null,
  routeStep: 0
};

function resolveApiBaseUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000/api/ET/v1";
  return "https://api.habeshago.com/api/ET/v1";
}

const API_BASE_URL = resolveApiBaseUrl();
const $ = (selector) => document.querySelector(selector);
const money = (amount, currency = "ETB") => `${Number(amount || 0).toLocaleString()} ${currency}`;
const formatStatus = (status = "") => String(status || "").replace(/_/g, " ").toUpperCase();

function apiUrl(path) {
  if (path.startsWith(API_BASE_URL)) return path;
  if (path.startsWith("http")) return path;
  let normalized = path.replace(/^\/api\/[^/]+\/v1/i, "");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return `${API_BASE_URL}${normalized}`;
}

function getToken() {
  return state.token || localStorage.getItem("hg_driver_token") || localStorage.getItem("habeshago_token") || "";
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = apiUrl(path);
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  state.lastApi = { status: response.status, body: data, url };
  console.log("API URL:", url);
  console.log("Method:", options.method || "GET");
  console.log("Response status:", response.status);
  console.log("Response body:", data);
  if (!response.ok) throw new Error(`Status ${response.status}: ${data.error || data.message || "Request failed"}`);
  return data;
}

function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2400);
}

function showActionStatus({ title, message, type = "", response = state.lastApi }) {
  const panel = $("#actionStatus");
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
  const original = button?.textContent;
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
      button.textContent = original;
    }
  }
}

function addActivity(message) {
  const feed = $("#activityFeed");
  const item = document.createElement("div");
  item.className = "activity-item";
  item.textContent = `${new Date().toLocaleTimeString()} • ${message}`;
  feed.prepend(item);
  while (feed.children.length > 20) feed.removeChild(feed.lastChild);
}

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("hg_driver_token", token);
  localStorage.setItem("hg_driver_user", JSON.stringify(user));
  localStorage.setItem("habeshago_token", token);
  localStorage.setItem("habeshago_user", JSON.stringify(user));
  renderSession();
}

function clearSession() {
  state.token = "";
  state.user = null;
  localStorage.removeItem("hg_driver_token");
  localStorage.removeItem("hg_driver_user");
  renderSession();
}

function renderSession() {
  $("#sessionBadge").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not signed in";
  $("#logoutBtn").hidden = !state.user;
}

async function login() {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: $("#email").value.trim().toLowerCase(), password: $("#password").value })
  });
  if (data.user.role !== "driver" && data.user.role !== "admin") {
    throw new Error(`Expected driver role, received ${data.user.role}`);
  }
  setSession(data.token, data.user);
  addActivity(`Logged in as ${data.user.name}`);
  await refreshAll();
}

async function restoreSession() {
  if (!state.token) return;
  try {
    const data = await api("/auth/me");
    state.user = data.user;
    renderSession();
  } catch {
    clearSession();
  }
}

function table(rows, columns, actions = () => "") {
  if (!rows.length) return "<div class='request-card'>No records yet. Ask merchant to mark order Ready and request driver.</div>";
  return `
    <table>
      <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}<th>Actions</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${columns.map((c) => `<td>${c.render ? c.render(row) : row[c.key] || ""}</td>`).join("")}
            <td><div class="actions">${actions(row)}</div></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function refreshAll() {
  if (!state.token) {
    renderEmpty();
    return;
  }

  const results = await Promise.allSettled([
    api("/drivers/available-requests"),
    api("/drivers/me/orders"),
    api("/wallet"),
    api("/profile/details")
  ]);

  state.requests = results[0].status === "fulfilled" ? (results[0].value.requests || []) : [];
  state.orders = results[1].status === "fulfilled" ? (results[1].value.orders || []) : [];
  state.wallet = results[2].status === "fulfilled" ? results[2].value : null;
  state.profile = results[3].status === "fulfilled" ? results[3].value.profile : null;

  state.activeOrder =
    state.orders.find((o) => ["driver_accepted", "driver_assigned", "picked_up", "on_the_way"].includes(String(o.status).toLowerCase())) ||
    state.orders.find((o) => !["delivered", "cancelled", "rejected"].includes(String(o.status).toLowerCase())) ||
    null;

  render();
  addActivity("Driver dashboard refreshed");
}

function renderEmpty() {
  $("#metrics").innerHTML = "";
  $("#requestsList").innerHTML = "<div class='request-card'>Login as driver to view requests.</div>";
  $("#requestsTable").innerHTML = "<div class='request-card'>Login as driver to view requests.</div>";
  $("#activeTrip").innerHTML = "<div class='request-card'>No active trip.</div>";
  $("#walletPanel").innerHTML = "";
  $("#historyTable").innerHTML = "";
}

function render() {
  const driver = state.profile?.driver || {};
  const activeOrders = state.orders.filter((o) => ["driver_accepted", "driver_assigned", "picked_up", "on_the_way"].includes(String(o.status).toLowerCase()));
  const delivered = state.orders.filter((o) => String(o.status).toLowerCase() === "delivered");
  const balance = state.wallet?.balance ?? state.wallet?.wallet?.balance ?? 0;

  $("#onlineLabel").textContent = driver.online ? "Online" : "Offline";
  $("#onlineToggleBtn").textContent = driver.online ? "Go Offline" : "Go Online";

  $("#metrics").innerHTML = [
    ["Available", state.requests.length],
    ["Active trips", activeOrders.length],
    ["Delivered", delivered.length],
    ["Wallet", money(balance)]
  ].map(([label, value]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");

  renderRequests();
  renderTrip();
  renderWallet();
  renderHistory();
  renderMap();
}

function renderRequests() {
  const requestCards = state.requests.map((r) => `
    <article class="request-card">
      <div class="row"><strong>Order ${String(r.order_id || r.id).slice(0, 8)}</strong><span class="pill">${formatStatus(r.status)}</span></div>
      <div class="muted">${r.pickup_note || "Pickup from merchant counter"} • ETA ${r.eta_minutes || 10} min</div>
      <div class="row"><span>Delivery fee</span><strong>${money(r.delivery_fee || 70, r.currency)}</strong></div>
      <div class="actions">
        <button data-accept-request="${r.id}">Accept delivery</button>
        <button class="danger" data-reject-request="${r.id}">Reject</button>
      </div>
    </article>
  `).join("");

  $("#requestsList").innerHTML = requestCards || "<div class='request-card'>No available requests yet.</div>";
  $("#requestsTable").innerHTML = table(state.requests, [
    { label: "Request", render: (r) => String(r.id).slice(0, 8) },
    { label: "Order", render: (r) => String(r.order_id || "").slice(0, 8) },
    { label: "ETA", render: (r) => `${r.eta_minutes || 10} min` },
    { label: "Fee", render: (r) => money(r.delivery_fee || 70, r.currency) },
    { label: "Status", render: (r) => formatStatus(r.status) }
  ], (r) => `<button data-accept-request="${r.id}">Accept</button><button class="danger" data-reject-request="${r.id}">Reject</button>`);

  bindRequestButtons();
}

function renderTrip() {
  const o = state.activeOrder;
  if (!o) {
    $("#activeTrip").innerHTML = "<div class='request-card'>No active trip. Accept a delivery request to start.</div>";
    return;
  }

  $("#activeTrip").innerHTML = `
    <div class="trip-detail">
      <div class="row"><strong>Order ${String(o.id).slice(0, 8)}</strong><span class="pill">${formatStatus(o.status)}</span></div>
      <p>${o.merchant_name || "Merchant"} → ${o.address_note || "Customer delivery address"}</p>
      <div class="row"><span>Total</span><strong>${money(o.total, o.currency)}</strong></div>
      <div class="row"><span>Payment</span><strong>${o.payment_status || "pending"}</strong></div>
      <div class="actions">
        ${driverActionButtons(o)}
      </div>
      <div class="timeline">
        ${["driver_assigned", "picked_up", "on_the_way", "delivered"].map((status) => `
          <div class="timeline-item ${statusIsActive(o.status, status) ? "active" : ""}">
            <span class="timeline-dot"></span>
            <span>${formatStatus(status)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
  bindStatusButtons();
}

function statusIsActive(current, target) {
  const order = ["driver_assigned", "driver_accepted", "picked_up", "on_the_way", "delivered"];
  return order.indexOf(String(current).toLowerCase()) >= order.indexOf(target);
}

function driverActionButtons(order) {
  const status = String(order.status).toLowerCase();
  if (status === "driver_accepted" || status === "driver_assigned") return `<button data-status="${order.id}|picked_up">Picked Up</button>`;
  if (status === "picked_up") return `<button data-status="${order.id}|on_the_way">On The Way</button><button data-status="${order.id}|delivered">Delivered</button>`;
  if (status === "on_the_way") return `<button data-status="${order.id}|delivered">Delivered</button>`;
  return "";
}

function renderWallet() {
  const tx = state.wallet?.transactions || state.wallet?.wallet?.transactions || [];
  const balance = state.wallet?.balance ?? state.wallet?.wallet?.balance ?? 0;
  $("#walletPanel").innerHTML = `
    <article class="card"><h3>Current Wallet</h3><div class="metric"><strong>${money(balance)}</strong><span>Driver balance</span></div></article>
    <article class="card"><h3>Recent Transactions</h3>${tx.slice(0, 6).map((t) => `<div class="request-card">${t.type || "transaction"} • ${money(t.amount, t.currency)}<br><span class="muted">${t.reason || ""}</span></div>`).join("") || "<p>No wallet transactions yet.</p>"}</article>
  `;
}

function renderHistory() {
  $("#historyTable").innerHTML = table(state.orders, [
    { label: "Order", render: (o) => String(o.id).slice(0, 8) },
    { label: "Merchant", key: "merchant_name" },
    { label: "Status", render: (o) => formatStatus(o.status) },
    { label: "Total", render: (o) => money(o.total, o.currency) },
    { label: "Address", key: "address_note" }
  ]);
}

function initMap() {
  if (state.map || !window.L) return;
  state.map = L.map("driverMap").setView([8.994, 38.789], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);
}

function clearMap() {
  state.layers.forEach((layer) => {
    try { state.map.removeLayer(layer); } catch {}
  });
  state.layers = [];
}

function safeMarker(item, label, color = "green") {
  const point = getLatLng(item);
  if (!point) {
    console.warn("Skipping invalid coordinates", item);
    return null;
  }
  const marker = L.circleMarker([point.lat, point.lng], {
    radius: 9,
    color,
    fillColor: color,
    fillOpacity: .85
  }).bindPopup(label);
  marker.addTo(state.map);
  state.layers.push(marker);
  return marker;
}

function getLatLng(item) {
  const lat = Number(item?.latitude ?? item?.lat);
  const lng = Number(item?.longitude ?? item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function renderMap() {
  initMap();
  if (!state.map) return;
  clearMap();

  const defaultDriver = { latitude: 8.9925, longitude: 38.7852 };
  const driver = state.activeOrder?.driver_location || defaultDriver;
  const merchant = state.activeOrder?.merchant_location || {
    latitude: state.activeOrder?.merchant_latitude ?? 8.994,
    longitude: state.activeOrder?.merchant_longitude ?? 38.789
  };
  const customer = state.activeOrder?.customer_location || state.activeOrder?.map_quote?.destination || {
    latitude: state.activeOrder?.destination?.lat ?? state.activeOrder?.destination_latitude ?? 8.997,
    longitude: state.activeOrder?.destination?.lng ?? state.activeOrder?.destination_longitude ?? 38.786
  };

  console.log("Driver:", driver);
  console.log("Merchant:", merchant);
  safeMarker(driver, "Driver", "#2563eb");
  safeMarker(merchant, "Pickup merchant", "#f59e0b");
  safeMarker(customer, "Customer drop-off", "#0b7a3b");

  const points = [driver, merchant, customer].map(getLatLng).filter(Boolean).map((point) => [point.lat, point.lng]);

  if (points.length >= 2) {
    const line = L.polyline(points, { color: "#2563eb", weight: 5, opacity: .75 }).addTo(state.map);
    state.layers.push(line);
    state.map.fitBounds(line.getBounds(), { padding: [40, 40] });
  }
}

async function acceptRequest(requestId) {
  await api("/drivers/accept-request", { method: "POST", body: JSON.stringify({ request_id: requestId }) });
  addActivity(`Accepted request ${String(requestId).slice(0, 8)}`);
  await refreshAll();
}

async function rejectRequest(requestId) {
  toast("Request rejected locally");
  addActivity(`Rejected request ${String(requestId).slice(0, 8)}`);
}

async function updateOrderStatus(orderId, status) {
  await api(`/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, reason: "driver_portal" })
  });
  addActivity(`Order ${String(orderId).slice(0, 8)} moved to ${formatStatus(status)}`);
  await refreshAll();
}

async function toggleOnline() {
  const driver = state.profile?.driver || {};
  const online = !driver.online;
  try {
    await api("/drivers/me/status", { method: "PATCH", body: JSON.stringify({ online }) });
  } catch {
    await api("/drivers/status", { method: "PATCH", body: JSON.stringify({ online }) });
  }
  addActivity(`Driver is now ${online ? "online" : "offline"}`);
  await refreshAll();
}

function bindRequestButtons() {
  document.querySelectorAll("[data-accept-request]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Accept delivery request", () => acceptRequest(button.dataset.acceptRequest)).catch(() => {});
  });
  document.querySelectorAll("[data-reject-request]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Reject delivery request", () => rejectRequest(button.dataset.rejectRequest)).catch(() => {});
  });
}

function bindStatusButtons() {
  document.querySelectorAll("[data-status]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Update delivery status", async () => {
      const [orderId, status] = button.dataset.status.split("|");
      await updateOrderStatus(orderId, status);
    }).catch(() => {});
  });
}

function simulateMovement() {
  const order = state.activeOrder;
  if (!order) {
    toast("No active order to simulate");
    return;
  }
  if (state.movementTimer) clearInterval(state.movementTimer);

  const route = [
    { latitude: 8.9925, longitude: 38.7852 },
    { latitude: 8.9931, longitude: 38.7860 },
    { latitude: 8.9940, longitude: 38.7871 },
    { latitude: 8.9951, longitude: 38.7879 },
    { latitude: 8.9962, longitude: 38.7869 },
    { latitude: 8.9970, longitude: 38.7860 }
  ];

  state.routeStep = 0;
  state.movementTimer = setInterval(async () => {
    const location = route[state.routeStep];
    if (!location) {
      clearInterval(state.movementTimer);
      state.movementTimer = null;
      toast("Driver movement completed");
      return;
    }

    try {
      await api("/drivers/location", {
        method: "PATCH",
        body: JSON.stringify({
          order_id: order.id,
          latitude: location.latitude,
          longitude: location.longitude
        })
      });
    } catch {
      order.driver_location = location;
    }

    order.driver_location = location;
    renderMap();
    addActivity(`Driver moved to ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`);
    state.routeStep += 1;
  }, 1800);
}

function switchSection(section) {
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link.dataset.section === section));
  document.querySelectorAll(".section").forEach((panel) => panel.classList.toggle("active", panel.dataset.view === section));
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
    renderMap();
  }, 100);
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    switchSection(link.dataset.section);
  });
});

$("#loginBtn").onclick = () => runButtonAction($("#loginBtn"), "Driver login", login).catch(() => {});
$("#refreshBtn").onclick = () => runButtonAction($("#refreshBtn"), "Refresh driver dashboard", refreshAll).catch(() => {});
$("#requestsRefreshBtn").onclick = () => runButtonAction($("#requestsRefreshBtn"), "Refresh requests", refreshAll).catch(() => {});
$("#onlineToggleBtn").onclick = () => runButtonAction($("#onlineToggleBtn"), "Toggle driver status", toggleOnline).catch(() => {});
$("#simulateMoveBtn").onclick = () => runButtonAction($("#simulateMoveBtn"), "Simulate driver movement", async () => simulateMovement()).catch(() => {});
$("#logoutBtn").onclick = () => {
  clearSession();
  renderEmpty();
  toast("Logged out");
};

document.querySelectorAll("[data-refresh-all]").forEach((button) => {
  button.onclick = () => runButtonAction(button, "Refresh", refreshAll).catch(() => {});
});

renderSession();
renderEmpty();
restoreSession().then(() => refreshAll()).catch(() => {});
setTimeout(() => {
  initMap();
  renderMap();
}, 200);
