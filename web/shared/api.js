const LOCAL_API_BASE_URL = "http://localhost:4000/api/ET/v1";
const PRODUCTION_API_BASE_URL = "https://api.habeshago.com/api/ET/v1";

export function resolveApiBaseUrl() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL;
}

export function apiUrl(path) {
  if (path.startsWith(resolveApiBaseUrl())) return path;
  if (path.startsWith("http")) return path;
  let normalized = path.replace(/^\/api\/[^/]+\/v1/i, "");
  normalized = normalized.replace(/^\/api\/admin/i, "/admin");
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;
  return `${resolveApiBaseUrl()}${normalized}`;
}

export async function apiFetch(path, options = {}) {
  const allowStatuses = options.allowStatuses || [];
  const tokenKey = options.tokenKey || "habeshago_token";
  const token = options.token || localStorage.getItem(tokenKey) || "";
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const fetchOptions = { ...options };
  delete fetchOptions.allowStatuses;
  delete fetchOptions.tokenKey;
  delete fetchOptions.token;
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = apiUrl(path);
  const payload = options.body ? JSON.parse(options.body) : null;
  console.log("API URL:", url);
  console.log("Payload:", payload);
  const response = await fetch(url, { ...fetchOptions, headers });
  const data = await response.json().catch(() => ({}));
  console.log("Status:", response.status);
  console.log("Response:", data);

  if (!response.ok && !allowStatuses.includes(response.status)) {
    const error = new Error(`Status ${response.status}: ${data.error || data.message || "Request failed"}`);
    error.status = response.status;
    error.body = data;
    error.url = url;
    throw error;
  }

  return { data, status: response.status, response, url };
}

export const HabeshaGoApi = { LOCAL_API_BASE_URL, PRODUCTION_API_BASE_URL, resolveApiBaseUrl, apiUrl, apiFetch };
window.HabeshaGoApi = HabeshaGoApi;
