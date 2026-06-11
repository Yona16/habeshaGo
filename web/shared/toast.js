export function ensureToastRoot() {
  let root = document.querySelector("[data-hg-toast-root]");
  if (!root) {
    root = document.createElement("div");
    root.dataset.hgToastRoot = "true";
    root.className = "hg-toast-root";
    document.body.appendChild(root);
  }
  return root;
}

export function toast(message, { type = "info", timeout = 2600 } = {}) {
  const root = ensureToastRoot();
  const item = document.createElement("div");
  item.className = `hg-toast hg-toast-${type}`;
  item.setAttribute("role", type === "error" ? "alert" : "status");
  item.textContent = message;
  root.appendChild(item);
  requestAnimationFrame(() => item.classList.add("show"));
  setTimeout(() => {
    item.classList.remove("show");
    setTimeout(() => item.remove(), 180);
  }, timeout);
  return item;
}

export function showActionStatus(target, { title, message, type = "info", status, body } = {}) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  el.hidden = false;
  el.className = `hg-action-status hg-action-${type}`;
  el.innerHTML = `
    <strong>${title || "Action"}</strong>
    <div>${message || ""}</div>
    <div>Backend response status: ${status ?? "No backend request yet"}</div>
    <details><summary>Debug response</summary><pre>${JSON.stringify(body || {}, null, 2)}</pre></details>
  `;
}

export const HabeshaGoToast = { ensureToastRoot, toast, showActionStatus };
window.HabeshaGoToast = HabeshaGoToast;
