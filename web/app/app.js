const state = {
  country: "ET",
  token: localStorage.getItem("hg_token") || "",
  user: JSON.parse(localStorage.getItem("hg_user") || "null"),
  products: [],
  merchants: []
};

const $ = (selector) => document.querySelector(selector);
const money = (amount, currency = "ETB") => `${Number(amount || 0).toLocaleString()} ${currency}`;

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

async function login(event) {
  event.preventDefault();
  const [email, password] = $("#accountSelect").value.split("|");
  const data = await api(`/api/${state.country}/v1/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setSession(data.token, data.user);
  toast(`Logged in as ${data.user.role}`);
  await refreshAll();
}

async function loadCatalog() {
  const merchants = await api(`/api/${state.country}/v1/merchants`);
  const products = await api(`/api/${state.country}/v1/products`);
  state.merchants = merchants.merchants;
  state.products = products.products;
  renderMerchants();
}

function renderMerchants() {
  $("#merchantList").innerHTML = state.merchants.map((merchant) => {
    const products = state.products.filter((product) => product.merchant_id === merchant.id);
    return `
      <article class="card">
        <h3>${merchant.name}</h3>
        <p>${merchant.category} - ${merchant.rating} rating</p>
        <div>
          ${merchant.women_owned ? '<span class="badge">Almaz</span>' : ""}
          ${merchant.verified ? '<span class="badge">Verified</span>' : ""}
          <span class="badge">${merchant.city_id}</span>
        </div>
        ${products.map((product) => `
          <div class="product">
            <span>${product.name}<br><small>${money(product.price, product.currency)}</small></span>
            <button data-add="${product.id}">Add</button>
          </div>
        `).join("")}
      </article>
    `;
  }).join("");

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
    { label: "Total", render: (o) => money(o.total, o.currency) },
    { label: "Safety", key: "safety_mode" },
    { label: "Address", key: "address_note" }
  ];
  $("#customerOrders").innerHTML = table(orders, cols);
  $("#merchantOrders").innerHTML = table(orders, cols, (o) => merchantActions(o));
  $("#driverOrders").innerHTML = table(orders.filter((o) => ["ready_for_pickup", "driver_accepted", "picked_up"].includes(o.status)), cols, (o) => driverActions(o));
  $("#adminOrders").innerHTML = table(orders, cols, (o) => `<button data-pay="${o.id}|Cash">Dummy cash</button> <button class="secondary" data-pay="${o.id}|Chapa">Dummy Chapa</button> <button class="danger" data-status="${o.id}|cancelled">Cancel</button>`);
  bindStatusButtons();
}

function merchantActions(order) {
  if (order.status === "placed") return `<button data-status="${order.id}|accepted">Accept</button> <button class="danger" data-status="${order.id}|rejected">Reject</button>`;
  if (order.status === "accepted") return `<button data-status="${order.id}|preparing">Prepare</button>`;
  if (order.status === "preparing") return `<button data-status="${order.id}|ready_for_pickup">Ready</button>`;
  return "";
}

function driverActions(order) {
  if (order.status === "ready_for_pickup") return `<button data-status="${order.id}|driver_accepted">Accept</button>`;
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
}

async function loadAdmin() {
  if (!state.token || state.user.role !== "admin") {
    $("#adminReports").innerHTML = "";
    $("#featureFlags").innerHTML = "<div class='card'>Login as admin to view operations.</div>";
    $("#paymentsPanel").innerHTML = "<div class='card'>Login as admin.</div>";
    $("#smsPanel").innerHTML = "<div class='card'>Login as admin.</div>";
    $("#compliancePanel").innerHTML = "";
    return;
  }
  const [reports, flags, payments, sms, compliance] = await Promise.all([
    api(`/api/${state.country}/v1/admin/reports`),
    api(`/api/${state.country}/v1/feature-flags`),
    api(`/api/${state.country}/v1/admin/payment-transactions`),
    api(`/api/${state.country}/v1/admin/sms-messages`),
    api(`/api/${state.country}/v1/compliance/reviews`)
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
  await loadCatalog();
  await renderCart();
  await loadOrders();
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

$("#loginForm").addEventListener("submit", (event) => login(event).catch((error) => toast(error.message)));
$("#logoutBtn").addEventListener("click", () => { clearSession(); refreshAll(); });
$("#placeOrderBtn").addEventListener("click", () => placeOrder().catch((error) => toast(error.message)));
$("#adjustWalletBtn").addEventListener("click", () => adjustWallet().catch((error) => toast(error.message)));
$("#sendSmsBtn").addEventListener("click", () => sendSampleSms().catch((error) => toast(error.message)));
$("#quoteMapBtn").addEventListener("click", () => quoteMap().catch((error) => toast(error.message)));
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", () => refreshAll().catch((error) => toast(error.message))));

renderSession();
refreshAll().catch((error) => toast(error.message));
