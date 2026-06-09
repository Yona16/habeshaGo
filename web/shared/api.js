export function resolveApiBaseUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:4000/api/ET/v1";
  return "https://api.habeshago.com/api/ET/v1";
}

export async function apiFetch(path, options = {}) {
  const baseUrl = resolveApiBaseUrl();
  const token = options.token || localStorage.getItem(options.tokenKey || "hg_token") || "";
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = path.startsWith("http") ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const payload = options.body ? JSON.parse(options.body) : null;
  console.log("API URL:", url);
  console.log("Payload:", payload);
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  console.log("Status:", response.status);
  console.log("Response:", data);
  if (!response.ok) {
    const error = new Error(`Status ${response.status}: ${data.error || "Request failed"}`);
    error.status = response.status;
    error.body = data;
    throw error;
  }
  return data;
}
