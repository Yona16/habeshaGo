const state = {
  country: "ET",
  token: localStorage.getItem("habeshago_token") || localStorage.getItem("hg_token") || "",
  user: JSON.parse(localStorage.getItem("habeshago_user") || localStorage.getItem("hg_user") || "null"),
  merchants: [],
  products: [],
  orders: [],
  cart: [],
  selectedMerchant: null,
  nearby: null,
  map: null,
  mapLayers: [],
  lastApi: null,
  events: null
};

function resolveApiBaseUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000/api/ET/v1";
  return "https://api.habeshago.com/api/ET/v1";
}

const API_BASE_URL = resolveApiBaseUrl();
const $ = (selector) => document.querySelector(selector);
const money = (amount, currency = "ETB") => `${Number(amount || 0).toLocaleString()} ${currency}`;
const foodImages = [
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80"
];

function apiUrl(path) {
  if (path.startsWith(API_BASE_URL)) return path;
  if (path.startsWith("http")) return path;
  let normalized = path.replace(/^\/api\/[^/]+\/v1/i, "");
  normalized = normalized.replace(/^\/api\/marketplace/i, "/marketplace");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return `${API_BASE_URL}${normalized}`;
}

function getToken() {
  return localStorage.getItem("habeshago_token") || state.token || "";
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
  console.log("Status:", response.status);
  console.log("Response:", data);
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
    <details>
      <summary>Debug response</summary>
      <pre>Backend response body: ${JSON.stringify(response?.body ?? {}, null, 2)}</pre>
    </details>
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
  while (feed.children.length > 18) feed.removeChild(feed.lastChild);
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

function renderSession() {
  $("#sessionLabel").textContent = state.user ? `${state.user.name} (${state.user.role})` : "Not signed in";
  $("#logoutBtn").hidden = !state.user;
}

async function loginDemo() {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "customer@habeshago.local", password: "Customer123!" })
  });
  setSession(data.token, data.user);
  addActivity("Customer logged in");
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

function selectedLocation() {
  const [lat, lng] = ($("#heroLocation")?.value || $("#nearbyLocation")?.value || "8.994|38.789").split("|").map(Number);
  return { lat, lng };
}

function syncLocation(value) {
  if ($("#heroLocation")) $("#heroLocation").value = value;
  if ($("#nearbyLocation")) $("#nearbyLocation").value = value;
}

async function loadCatalog() {
  const loc = selectedLocation();
  const radius = $("#nearbyRadius")?.value || 5;
  const minRating = $("#minRating")?.value || 0;
  const sort = $("#merchantSort")?.value || "nearest";
  const search = encodeURIComponent($("#searchInput")?.value || "");
  const activeChip = document.querySelector(".chip.active");
  const type = encodeURIComponent(activeChip?.dataset.category || "");

  const [nearby, products] = await Promise.all([
    api(`/marketplace/nearby?lat=${loc.lat}&lng=${loc.lng}&radiusKm=${radius}&minimumReview=${minRating}&sortBy=${sort}&type=${type}&search=${search}`),
    api("/products")
  ]);

  state.nearby = nearby;
  state.merchants = nearby.merchants || [];
  state.products = products.products || [];
  if (!state.selectedMerchant || !state.merchants.some((m) => m.id === state.selectedMerchant.id)) {
    state.selectedMerchant = state.merchants.find(hasCoords) || state.merchants[0] || null;
  }

  renderDashboard();
  renderMerchants();
  renderRecommended();
  renderProducts();
  renderMap();
}

function hasCoords(item) {
  const point = getLatLng(item);
  return Boolean(point);
}

function getLatLng(item) {
  const lat = Number(item?.latitude ?? item?.lat);
  const lng = Number(item?.longitude ?? item?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function selectedMerchantOrThrow() {
  const merchant = state.selectedMerchant || state.merchants.find((item) => item?.id) || null;
  console.log("Selected merchant:", merchant);
  if (!merchant || !merchant.id) {
    throw new Error("Please choose a restaurant.");
  }
  return merchant;
}

function cartItemsOrThrow() {
  if (!state.cart.length) {
    throw new Error("Please select a restaurant and add items to cart before placing an order.");
  }
  const items = state.cart.map((item) => ({
    product_id: item.product_id || item.id,
    quantity: Number(item.quantity || 1)
  }));
  if (items.some((item) => !item.product_id || !Number.isFinite(item.quantity) || item.quantity < 1)) {
    throw new Error("Please select a restaurant and add items to cart before placing an order.");
  }
  return items;
}

function merchantImage(index) {
  return foodImages[index % foodImages.length];
}

function deliveryFeeFor(merchant) {
  const distance = Number(merchant?.distance_km || 1);
  return Math.max(45, Math.round(35 + distance * 18));
}

function renderDashboard() {
  $("#merchantMetric").textContent = state.merchants.length;
  $("#productMetric").textContent = state.products.length;
  $("#orderMetric").textContent = state.orders.filter((o) => !["delivered", "cancelled", "rejected"].includes(String(o.status).toLowerCase())).length;
  $("#driverMetric").textContent = state.nearby?.drivers?.length || 0;
}

function renderMerchants() {
  $("#merchantGrid").innerHTML = state.merchants.map((merchant, index) => `
    <article class="merchant-card ${state.selectedMerchant?.id === merchant.id ? "selected" : ""}" data-merchant-id="${merchant.id}">
      <div class="merchant-img" style="background-image:url('${merchantImage(index)}')"></div>
      <div class="merchant-body">
        <div class="card-topline">
          <div class="badge">${merchant.category || "restaurant"}</div>
          <span class="open-badge">${merchant.status === "open" ? "Open" : "Closed"}</span>
        </div>
        <h4>${merchant.name}</h4>
        <div class="meta">
          <span>⭐ ${merchant.rating ?? 0}</span>
          <span>${merchant.review_count || 0} reviews</span>
          <span>${merchant.distance_km ?? "?"} km</span>
          <span>${merchant.prep_time_minutes || 20}-${Number(merchant.prep_time_minutes || 20) + 12} min</span>
        </div>
        <p class="merchant-promo">${deliveryFeeFor(merchant) <= 60 ? "Free delivery over 500 ETB" : `${money(deliveryFeeFor(merchant))} delivery`}</p>
      </div>
    </article>
  `).join("") || "<div class='order-card'>No merchants found. Try refreshing or changing filters.</div>";

  document.querySelectorAll("[data-merchant-id]").forEach((card) => {
    card.onclick = () => {
      state.selectedMerchant = state.merchants.find((m) => m.id === card.dataset.merchantId);
      addActivity(`Selected ${state.selectedMerchant?.name}`);
      renderMerchants();
      renderRecommended();
      renderProducts();
      renderMap();
    };
  });
}

function renderRecommended() {
  const merchant = state.selectedMerchant;
  const products = (merchant ? state.products.filter((product) => product.merchant_id === merchant.id) : state.products).slice(0, 4);
  $("#recommendedGrid").innerHTML = products.map((product, index) => `
    <article class="product-card compact">
      <div class="product-img" style="background-image:url('${product.image_url && product.image_url.startsWith("http") ? product.image_url : merchantImage(index + 2)}')"></div>
      <div>
        <span class="badge">${product.category || "popular"}</span>
        <h4>${product.name}</h4>
        <p>${product.description || "Recommended near your delivery address."}</p>
        <div class="product-actions">
          <strong>${money(product.price, product.currency)}</strong>
          <button data-add-product="${product.id}">Add</button>
        </div>
      </div>
    </article>
  `).join("") || "<div class='order-card'>No recommended items yet.</div>";
  document.querySelectorAll("#recommendedGrid [data-add-product]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Add recommended item", () => addToCart(button.dataset.addProduct)).catch(() => {});
  });
}

function renderProducts() {
  const merchant = state.selectedMerchant;
  $("#selectedMerchantTitle").textContent = merchant ? merchant.name : "Select a merchant";
  $("#selectedMerchantMeta").textContent = merchant ? `${merchant.category || "merchant"} • ${merchant.distance_km ?? "?"} km • ${merchant.status || "open"}` : "No merchant selected";

  if (!merchant) {
    $("#merchantHero").innerHTML = "";
    $("#productGrid").innerHTML = "<div class='order-card'>Choose a restaurant to view its menu.</div>";
    $("#menuRequestBtn").disabled = true;
    return;
  }
  $("#menuRequestBtn").disabled = false;
  $("#merchantHero").innerHTML = `
    <div class="merchant-hero-img" style="background-image:url('${merchantImage(Math.max(0, state.merchants.findIndex((item) => item.id === merchant.id)))}')"></div>
    <div>
      <h4>${merchant.name}</h4>
      <p>⭐ ${merchant.rating ?? 0} • ${merchant.review_count || 0} reviews • ${merchant.prep_time_minutes || 20}-${Number(merchant.prep_time_minutes || 20) + 12} min • ${money(deliveryFeeFor(merchant))} delivery</p>
      <p>${merchant.address_note || "Addis Ababa local pickup"} • ${merchant.opening_hours || "Mon-Sun 8:00 AM - 10:00 PM"}</p>
    </div>
  `;

  let products = state.products.filter((product) => product.merchant_id === merchant.id);
  if (!products.length) products = state.products.slice(0, 6);

  $("#productGrid").innerHTML = products.map((product, index) => `
    <article class="product-card">
      <div class="product-img" style="background-image:url('${product.image_url && product.image_url.startsWith("http") ? product.image_url : merchantImage(index + 1)}')"></div>
      <div>
        <h4>${product.name}</h4>
        <p>${product.description || "Fresh local item prepared by the merchant."}</p>
        <div class="product-actions">
          <strong>${money(product.price, product.currency)}</strong>
          <div class="quantity-control">
            <button data-add-product="${product.id}">Add</button>
            <span>Qty 1</span>
          </div>
        </div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-add-product]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Add to cart", () => addToCart(button.dataset.addProduct)).catch(() => {});
  });
}

async function addToCart(productId) {
  if (!state.user) throw new Error("Please login as customer first.");
  selectedMerchantOrThrow();
  if (!productId) throw new Error("Please choose a menu item.");
  await api("/cart/items", { method: "POST", body: JSON.stringify({ product_id: productId, quantity: 1 }) });
  addActivity("Item added to cart");
  await loadCart();
}

async function sendMenuRequest() {
  if (!state.user) throw new Error("Please login as customer first.");
  const merchant = selectedMerchantOrThrow();
  await api("/menu-requests", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: merchant.id,
      item_name: $("#menuRequestName")?.value || "Special menu request",
      note: $("#menuRequestNote")?.value || "Please confirm availability."
    })
  });
  addActivity(`Menu request sent to ${merchant.name}`);
  toast("Menu request sent");
}

async function addSampleCart() {
  if (!state.user) await loginDemo();
  await api("/cart/sample", { method: "POST", body: JSON.stringify({ bundle: "family_lunch" }) });
  addActivity("Sample food cart added");
  await loadCart();
}

async function updateCartItem(productId, quantity) {
  if (!state.user) throw new Error("Please login as customer first.");
  await api("/cart/items", { method: "PATCH", body: JSON.stringify({ product_id: productId, quantity }) });
  addActivity("Cart updated");
  await loadCart();
}

async function removeCartItem(productId) {
  if (!state.user) throw new Error("Please login as customer first.");
  await api(`/cart/items/${encodeURIComponent(productId)}`, { method: "DELETE" });
  addActivity("Item removed from cart");
  await loadCart();
}

async function clearCart() {
  if (!state.user) throw new Error("Please login as customer first.");
  await api("/cart", { method: "DELETE" });
  addActivity("Cart cleared");
  await loadCart();
}

async function useCurrentLocation() {
  if (!navigator.geolocation) {
    toast("GPS unavailable. Using Bole Medhanealem.");
    syncLocation("8.994|38.789");
    await loadCatalog();
    return;
  }
  await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const value = `${position.coords.latitude.toFixed(4)}|${position.coords.longitude.toFixed(4)}`;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = "Current location";
        $("#heroLocation").appendChild(option);
        $("#nearbyLocation").appendChild(option.cloneNode(true));
        syncLocation(value);
        resolve();
      },
      () => {
        toast("Location permission denied. Using Bole Medhanealem.");
        syncLocation("8.994|38.789");
        resolve();
      },
      { enableHighAccuracy: true, timeout: 2500, maximumAge: 60000 }
    );
  });
  await loadCatalog();
}

async function loadCart() {
  if (!state.token) {
    state.cart = [];
    renderCart();
    return;
  }
  try {
    const data = await api("/cart");
    state.cart = data.cart?.items || [];
  } catch {
    state.cart = [];
  }
  renderCart();
}

function renderCart() {
  const count = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  $("#cartCount").textContent = count;
  if (!state.cart.length) {
    $("#cartList").innerHTML = "<div class='cart-row'><span>Cart is empty</span><strong>0 ETB</strong></div>";
    $("#cartDrawerBody").innerHTML = $("#cartList").innerHTML;
    $("#cartDrawerSummary").innerHTML = "<div class='cart-row total'><span>Total</span><strong>0 ETB</strong></div>";
    return;
  }
  const total = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0);
  const deliveryFee = 60;
  const serviceFee = Math.max(15, Math.round(total * 0.04));
  const promoDiscount = $("#promoCode")?.value.trim().toUpperCase() === "BOLE10" ? Math.round(total * 0.1) : 0;
  const grandTotal = Math.max(0, total + deliveryFee + serviceFee - promoDiscount);
  const rows = state.cart.map((item) => `
    <div class="cart-row">
      <span>${item.quantity} x ${item.name}</span>
      <div class="cart-controls">
        <button data-cart-dec="${item.product_id}">-</button>
        <strong>${money(Number(item.quantity) * Number(item.unit_price), item.currency)}</strong>
        <button data-cart-inc="${item.product_id}">+</button>
        <button data-cart-remove="${item.product_id}" class="ghost-dark">Remove</button>
      </div>
    </div>
  `).join("");
  const summary = `
    <div class="cart-row"><span>Subtotal</span><strong>${money(total)}</strong></div>
    <div class="cart-row"><span>Delivery fee</span><strong>${money(deliveryFee)}</strong></div>
    <div class="cart-row"><span>Service fee</span><strong>${money(serviceFee)}</strong></div>
    <div class="cart-row"><span>Promo discount</span><strong>-${money(promoDiscount)}</strong></div>
    <div class="cart-row total"><span>Total</span><strong>${money(grandTotal)}</strong></div>
  `;
  $("#cartList").innerHTML = rows;
  $("#cartDrawerBody").innerHTML = rows;
  $("#cartDrawerSummary").innerHTML = summary;
  bindCartControls();
}

function bindCartControls() {
  document.querySelectorAll("[data-cart-inc]").forEach((button) => {
    button.onclick = () => {
      const item = state.cart.find((entry) => entry.product_id === button.dataset.cartInc);
      runButtonAction(button, "Increase quantity", () => updateCartItem(button.dataset.cartInc, Number(item?.quantity || 0) + 1)).catch(() => {});
    };
  });
  document.querySelectorAll("[data-cart-dec]").forEach((button) => {
    button.onclick = () => {
      const item = state.cart.find((entry) => entry.product_id === button.dataset.cartDec);
      runButtonAction(button, "Decrease quantity", () => updateCartItem(button.dataset.cartDec, Number(item?.quantity || 0) - 1)).catch(() => {});
    };
  });
  document.querySelectorAll("[data-cart-remove]").forEach((button) => {
    button.onclick = () => runButtonAction(button, "Remove item", () => removeCartItem(button.dataset.cartRemove)).catch(() => {});
  });
}

async function placeOrder() {
  if (!state.user) throw new Error("Login as customer first.");
  const merchant = selectedMerchantOrThrow();
  const items = cartItemsOrThrow();
  const deliveryAddress = $("#addressNote").value.trim();
  const paymentMethod = $("#paymentMethod").value;
  if (!deliveryAddress || !paymentMethod) {
    throw new Error("Please enter a delivery address and payment method.");
  }
  const data = await api("/orders", {
    method: "POST",
    body: JSON.stringify({
      merchant_id: merchant.id,
      items,
      delivery_address: deliveryAddress,
      landmark_note: deliveryAddress,
      payment_method: paymentMethod,
      promo_code: $("#promoCode").value.trim(),
      address_label: "Home - Bole",
      address_note: deliveryAddress,
      customer_note: $("#deliveryNote")?.value || "Customer placed order from HabeshaGo customer app",
      contact_phone: $("#contactPhone")?.value || state.user.phone,
      safety_mode: "standard",
      community_delivery: false,
      destination: selectedLocation()
    })
  });

  if (paymentMethod !== "Cash") {
    await api("/payments/simulate", { method: "POST", body: JSON.stringify({ order_id: data.order.id, provider: paymentMethod }) });
  }

  addActivity(`Order ${data.order.id.slice(0, 8)} placed`);
  toast(`Order placed: ${data.order.id.slice(0, 8)}`);
  state.cart = [];
  $("#cartDrawer").hidden = true;
  await refreshAll();
  document.querySelector("#ordersPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function loadOrders() {
  if (!state.token) {
    state.orders = [];
    renderOrders();
    return;
  }
  try {
    const data = await api("/orders");
    state.orders = data.orders || [];
  } catch {
    state.orders = [];
  }
  renderOrders();
  renderDashboard();
}

function renderOrders() {
  const active = state.orders.filter((o) => !["delivered", "cancelled", "rejected"].includes(String(o.status).toLowerCase()));
  const rows = (active.length ? active : state.orders.slice(0, 4)).map((order) => `
    <article class="order-card">
      <strong>Order ${String(order.id).slice(0, 8)} • ${formatStatus(order.status)}</strong>
      <p>${order.merchant_name || "Merchant"} to ${order.address_note || "Delivery address"} • ETA ${order.map_quote?.eta_minutes || 25} min</p>
      <p>${order.driver_name ? `${order.driver_name} • ${order.driver_phone || "phone pending"} • ${order.driver_vehicle || "vehicle pending"}` : "Driver assignment pending"}</p>
      <div class="status-timeline">
        ${["placed","accepted","preparing","ready_for_pickup","driver_accepted","picked_up","on_the_way","delivered"].map((status) => `
          <span class="status-step ${statusIsActive(order.status, status) ? "active" : ""}">${formatStatus(status)}</span>
        `).join("")}
      </div>
      <button class="soft-dark" data-help-order="${order.id}">Help</button>
    </article>
  `).join("");
  $("#ordersPanel").innerHTML = rows || "<div class='order-card'>No orders yet. Add items and checkout.</div>";
  document.querySelectorAll("[data-help-order]").forEach((button) => {
    button.onclick = () => toast(`Support opened for order ${button.dataset.helpOrder.slice(0, 8)}`);
  });
}

function formatStatus(status = "") {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "driver_accepted") return "DRIVER ASSIGNED";
  return normalized.replace(/_/g, " ").toUpperCase();
}

function statusIsActive(current, target) {
  const order = ["placed","accepted","preparing","ready_for_pickup","driver_requested","driver_accepted","picked_up","on_the_way","delivered"];
  return order.indexOf(String(current).toLowerCase()) >= order.indexOf(target);
}

function initMap() {
  const notice = $("#mapNotice");
  if (state.map) return;
  if (!window.L) {
    notice.textContent = "Leaflet did not load. Showing fallback map list.";
    notice.classList.add("error");
    $("#mapFallback").hidden = false;
    return;
  }
  state.map = L.map("leafletMap", { zoomControl: true }).setView([8.994, 38.789], 14);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(state.map);
  notice.textContent = "OpenStreetMap loaded. Showing merchants and drivers.";
  setTimeout(() => state.map.invalidateSize(), 150);
}

function clearMap() {
  if (!state.map) return;
  state.mapLayers.forEach((layer) => {
    try { state.map.removeLayer(layer); } catch {}
  });
  state.mapLayers = [];
}

function safeMarker(item, label, color = "#0b7a3b") {
  const point = getLatLng(item);
  if (!point) {
    console.warn("Skipping invalid coordinates", item);
    return null;
  }
  const marker = L.circleMarker([point.lat, point.lng], {
    radius: 9,
    color,
    fillColor: color,
    fillOpacity: 0.88
  }).bindPopup(label);
  marker.addTo(state.map);
  state.mapLayers.push(marker);
  return marker;
}

function renderMapFallback() {
  const fallback = $("#mapFallback");
  const merchants = (state.merchants || []).filter(hasCoords).slice(0, 6).map((m) => `<li>🏬 ${m.name} — ${m.latitude}, ${m.longitude}</li>`).join("");
  const drivers = (state.nearby?.drivers || []).filter(hasCoords).slice(0, 6).map((d) => `<li>🏍️ ${d.vehicle_plate || d.id} — ${d.latitude}, ${d.longitude}</li>`).join("");
  fallback.innerHTML = `<strong>Map data</strong><ul>${merchants}${drivers}</ul>`;
}

function renderMap() {
  initMap();
  renderMapFallback();
  if (!state.map) return;
  clearMap();

  const loc = selectedLocation();
  safeMarker({ latitude: loc.lat, longitude: loc.lng }, "You / delivery location", "#0b7a3b");

  (state.merchants || []).forEach((merchant) => {
    console.log("Merchant:", merchant);
    safeMarker(merchant, merchant.name, "#f59e0b");
  });
  (state.nearby?.drivers || []).forEach((driver) => {
    console.log("Driver:", driver);
    safeMarker(driver, `Driver ${driver.vehicle_plate || driver.id}`, "#2563eb");
  });

  const points = [{ latitude: loc.lat, longitude: loc.lng }, ...(state.merchants || []).filter(hasCoords), ...(state.nearby?.drivers || []).filter(hasCoords)];
  const latlngs = points.map(getLatLng).filter(Boolean).map((point) => [point.lat, point.lng]);
  if (latlngs.length > 1) {
    const bounds = L.latLngBounds(latlngs);
    state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
  setTimeout(() => state.map.invalidateSize(), 150);
}

async function refreshAll() {
  await Promise.allSettled([loadCatalog(), loadCart(), loadOrders()]);
}

async function runLiveDemo() {
  try {
    const data = await api("/live-demo/start", { method: "POST", body: "{}" });
    if (data.token && data.user) setSession(data.token, data.user);
    addActivity("Live demo started: customer order → merchant → driver");
    toast("Live demo started");
    await refreshAll();
  } catch (error) {
    addActivity(`Live demo failed: ${error.message}`);
    throw error;
  }
}

function bind() {
  $("#demoLoginBtn").onclick = () => runButtonAction($("#demoLoginBtn"), "Demo customer login", loginDemo).catch(() => {});
  $("#refreshBtn").onclick = () => runButtonAction($("#refreshBtn"), "Refresh dashboard", refreshAll).catch(() => {});
  $("#profileBtn").onclick = () => toast(state.user ? `${state.user.name} profile is active` : "Login to view profile");
  $("#applyDiscoveryBtn").onclick = () => runButtonAction($("#applyDiscoveryBtn"), "Apply discovery filters", loadCatalog).catch(() => {});
  $("#searchBtn").onclick = () => runButtonAction($("#searchBtn"), "Search merchants", loadCatalog).catch(() => {});
  $("#currentLocationBtn").onclick = () => runButtonAction($("#currentLocationBtn"), "Use current location", useCurrentLocation).catch(() => {});
  $("#promoApplyBtn").onclick = () => {
    $("#promoCode").value = "BOLE10";
    renderCart();
    toast("Promo BOLE10 applied");
  };
  $("#heroLocation").onchange = () => {
    syncLocation($("#heroLocation").value);
    loadCatalog().catch((error) => toast(error.message));
  };
  $("#nearbyLocation").onchange = () => syncLocation($("#nearbyLocation").value);
  $("#refreshMapBtn").onclick = () => runButtonAction($("#refreshMapBtn"), "Refresh nearby map", async () => { await loadCatalog(); renderMap(); }).catch(() => {});
  $("#sampleCartBtn").onclick = () => runButtonAction($("#sampleCartBtn"), "Add sample cart", addSampleCart).catch(() => {});
  $("#menuRequestBtn").onclick = () => runButtonAction($("#menuRequestBtn"), "Send menu request", sendMenuRequest).catch(() => {});
  $("#placeOrderBtn").onclick = () => runButtonAction($("#placeOrderBtn"), "Place order", placeOrder).catch(() => {});
  $("#liveDemoBtn").onclick = () => runButtonAction($("#liveDemoBtn"), "Run live end-to-end demo", runLiveDemo).catch(() => {});
  $("#logoutBtn").onclick = () => { clearSession(); toast("Logged out"); };
  $("#cartOpenBtn").onclick = () => { $("#cartDrawer").hidden = false; };
  $("#bottomCartBtn").onclick = () => { $("#cartDrawer").hidden = false; };
  $("#cartCloseBtn").onclick = () => { $("#cartDrawer").hidden = true; };
  $("#cartCloseBackdrop").onclick = () => { $("#cartDrawer").hidden = true; };
  $("#clearCartBtn").onclick = () => runButtonAction($("#clearCartBtn"), "Clear cart", clearCart).catch(() => {});
  $("#drawerCheckoutBtn").onclick = () => { $("#cartDrawer").hidden = true; document.querySelector(".checkout-panel").scrollIntoView({ behavior: "smooth" }); };

  document.querySelectorAll(".chip").forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll(".chip").forEach((chip) => chip.classList.remove("active"));
      button.classList.add("active");
      loadCatalog().catch((error) => toast(error.message));
    };
  });

  window.addEventListener("resize", () => {
    if (state.map) state.map.invalidateSize();
  });
}

renderSession();
bind();
restoreSession().then(refreshAll).catch(() => refreshAll());
setTimeout(() => {
  initMap();
  renderMap();
}, 350);
