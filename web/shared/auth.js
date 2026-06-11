import { apiFetch } from "./api.js";

const DEFAULT_TOKEN_KEY = "habeshago_token";
const DEFAULT_USER_KEY = "habeshago_user";

export function getSession({ tokenKey = DEFAULT_TOKEN_KEY, userKey = DEFAULT_USER_KEY } = {}) {
  const token = localStorage.getItem(tokenKey) || "";
  const user = JSON.parse(localStorage.getItem(userKey) || "null");
  return { token, user };
}

export function setSession(token, user, { tokenKey = DEFAULT_TOKEN_KEY, userKey = DEFAULT_USER_KEY, extraKeys = [] } = {}) {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
  for (const pair of extraKeys) {
    localStorage.setItem(pair.tokenKey, token);
    localStorage.setItem(pair.userKey, JSON.stringify(user));
  }
  window.dispatchEvent(new CustomEvent("habeshago:session", { detail: { token, user } }));
}

export function clearSession({ tokenKey = DEFAULT_TOKEN_KEY, userKey = DEFAULT_USER_KEY, extraKeys = [] } = {}) {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
  for (const pair of extraKeys) {
    localStorage.removeItem(pair.tokenKey);
    localStorage.removeItem(pair.userKey);
  }
  window.dispatchEvent(new CustomEvent("habeshago:session", { detail: { token: "", user: null } }));
}

export async function validateSession(options = {}) {
  const result = await apiFetch("/auth/me", options);
  const user = result.data.user;
  if (options.requiredRole && user.role !== options.requiredRole) {
    throw new Error(`Expected ${options.requiredRole} role, received ${user.role}`);
  }
  return user;
}

export function roleHome(role) {
  return {
    customer: "/app",
    merchant: "/merchant",
    driver: "/driver",
    admin: "/admin"
  }[role] || "/app";
}

export const HabeshaGoAuth = { getSession, setSession, clearSession, validateSession, roleHome };
window.HabeshaGoAuth = HabeshaGoAuth;
