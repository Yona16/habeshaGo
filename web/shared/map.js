export function getLatLng(item) {
  const lat = Number(item?.latitude ?? item?.lat);
  const lng = Number(item?.longitude ?? item?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  console.warn("Skipping invalid coordinates", item);
  return null;
}

export function safeMarker(map, item, options = {}) {
  const point = getLatLng(item);
  if (!point || !window.L || !map) return null;
  return L.marker([point.lat, point.lng], options).addTo(map);
}

export function safePolyline(map, points, options = {}) {
  if (!window.L || !map) return null;
  const valid = (points || []).map(getLatLng).filter(Boolean).map((point) => [point.lat, point.lng]);
  if (valid.length < 2) return null;
  return L.polyline(valid, options).addTo(map);
}

export function fitMapToItems(map, items) {
  if (!window.L || !map) return;
  const valid = (items || []).map(getLatLng).filter(Boolean).map((point) => [point.lat, point.lng]);
  if (!valid.length) return;
  map.fitBounds(L.latLngBounds(valid), { padding: [28, 28] });
}

export function mapFallback(target, message = "Map is unavailable. Showing list view instead.") {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (el) el.innerHTML = `<div class="hg-map-fallback">${message}</div>`;
}

export const HabeshaGoMap = { getLatLng, safeMarker, safePolyline, fitMapToItems, mapFallback };
window.HabeshaGoMap = HabeshaGoMap;
