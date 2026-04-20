import axios from "axios";
import { auth } from "../firebase";

/* ------------------------------------------------------------------
 * HTTP client
 * ------------------------------------------------------------------*/
const api = axios.create({
  // In dev: empty baseURL → relative /api/* → Vite proxy → backend.
  // In prod: VITE_API_BASE_URL → absolute URL of deployed backend.
  baseURL: import.meta.env.VITE_API_BASE_URL || "",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach Firebase auth token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // token fetch failed — request will go un-authed and 401
    }
  }
  return config;
});

// Normalize errors so callers always see {status, message}
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status;
    const message =
      err?.response?.data?.error || err?.message || "Network error";
    return Promise.reject({ status, message, original: err });
  },
);

/* ------------------------------------------------------------------
 * Tiny in-memory cache + in-flight dedupe
 *   - prevents duplicate parallel requests for the same key
 *   - serves cached responses for `ttlMs` after success
 * ------------------------------------------------------------------*/
const cache = new Map(); // key -> { value, expiresAt }
const inflight = new Map(); // key -> Promise

async function cached(key, ttlMs, fetcher) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return hit.value;
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const value = await fetcher();
      cache.set(key, { value, expiresAt: now + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, p);
  return p;
}

export function invalidateCache(prefix = "") {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/* ------------------------------------------------------------------
 * Public endpoints
 * ------------------------------------------------------------------*/
export const fetchHealth = () => api.get("/api/health").then((r) => r.data);

export const fetchRoutes = () =>
  cached("routes", 5 * 60 * 1000, async () => {
    const r = await api.get("/api/routes");
    return r.data.routes;
  });

export const fetchRouteDetail = (routeId) =>
  cached(`route:${routeId}`, 5 * 60 * 1000, async () => {
    const r = await api.get(`/api/routes/${routeId}`);
    return r.data;
  });

export const fetchStops = () =>
  cached("stops", 10 * 60 * 1000, async () => {
    const r = await api.get("/api/stops");
    return r.data.stops;
  });

export const fetchLeaderboard = async ({
  period = "all",
  limit = 50,
  offset = 0,
} = {}) => {
  const r = await api.get("/api/leaderboard", {
    params: { period, limit, offset },
  });
  return r.data;
};

/* ------------------------------------------------------------------
 * Authenticated endpoints (never cached; user-specific & mutable)
 * ------------------------------------------------------------------*/
export const fetchMe = () => api.get("/api/me").then((r) => r.data);
export const fetchStats = () => api.get("/api/me/stats").then((r) => r.data);
export const fetchActivity = (limit = 20) =>
  api
    .get("/api/me/activity", { params: { limit } })
    .then((r) => r.data.activity);

export const fetchProgress = () =>
  api.get("/api/me/progress").then((r) => r.data.progress);

export const markSegments = async (
  routeId,
  directionId,
  fromStopId,
  toStopId,
  notes = "",
) => {
  const r = await api.post("/api/me/segments", {
    route_id: routeId,
    direction_id: directionId,
    from_stop_id: fromStopId,
    to_stop_id: toStopId,
    notes,
  });
  return r.data;
};

export const updateSegmentNotes = (segmentId, notes) =>
  api.put(`/api/me/segments/${segmentId}/notes`, { notes }).then((r) => r.data);

export const deleteSegment = (segmentId) =>
  api.delete(`/api/me/segments/${segmentId}`).then((r) => r.data);

export const bulkDeleteSegments = (payload) =>
  api.delete("/api/me/segments/bulk", { data: payload }).then((r) => r.data);

/* Re-export retry helper for components that want optimistic flows */
export async function retry(fn, { tries = 3, delayMs = 600 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (err?.status && err.status < 500 && err.status !== 429) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastErr;
}
