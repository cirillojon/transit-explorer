import polyline from "@mapbox/polyline";

export const SEATTLE_CENTER = [47.6062, -122.3321];

export const HELP_SEEN_KEY = "te-help-seen-v1";
const TRIP_TIMES_KEY = "te-trip-times-v1";
const TRIP_TIMES_MAX = 25; // keep at most N samples per route+direction

export const ROUTE_TYPE_LABELS = {
  0: "Link",
  1: "Subway",
  2: "Rail",
  3: "Bus",
  4: "Ferry",
  5: "Cable",
  6: "Gondola",
  7: "Funicular",
};

export const ROUTE_TYPE_ICONS = {
  0: "🚊",
  1: "🚇",
  2: "🚆",
  3: "🚌",
  4: "⛴️",
  5: "🚠",
  6: "🚠",
  7: "🚞",
};

function readTripTimes() {
  try {
    const raw = localStorage.getItem(TRIP_TIMES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function recordTripTime(routeId, directionId, ms) {
  if (!routeId || ms == null || ms <= 0) return null;
  const all = readTripTimes();
  const key = `${routeId}|${directionId}`;
  const list = Array.isArray(all[key]) ? all[key] : [];
  list.push(Math.round(ms));
  const trimmed = list.slice(-TRIP_TIMES_MAX);
  all[key] = trimmed;
  try {
    localStorage.setItem(TRIP_TIMES_KEY, JSON.stringify(all));
  } catch {
    /* storage full / disabled — ignore */
  }
  return trimmed;
}

export function getTripStats(routeId, directionId) {
  const all = readTripTimes();
  const list = all[`${routeId}|${directionId}`] || [];
  if (!list.length) return null;
  const total = list.reduce((a, b) => a + b, 0);
  return {
    count: list.length,
    avgMs: total / list.length,
    lastMs: list[list.length - 1],
  };
}

export function formatDuration(ms) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin ? `${hr}h ${remMin}m` : `${hr}h`;
}

export function decode(encoded) {
  if (!encoded) return [];
  return polyline.decode(encoded);
}

export function normalizeDirectionId(value) {
  if (value == null) return null;
  return String(value);
}

/**
 * Shared eligibility rules for a stop given the current boarding pick.
 * Used by both the map markers and the search results so they can't drift
 * out of sync.
 *
 * Returns one of:
 *   - "idle":      no active pick (stop is just selectable to board)
 *   - "boarding":  this is the currently-boarded stop
 *   - "candidate": same direction, downstream of boarding — valid alight
 *   - "upstream":  same direction, at-or-before boarding — invalid alight
 *   - "other":     pick is active but this stop is in a different direction
 */
export function getStopPickStatus(stop, pickState, boardingOrderIndex) {
  if (!pickState) return "idle";
  const samePick = pickState.directionId === stop.directionId;
  if (samePick && pickState.fromStopId === stop.id) return "boarding";
  if (!samePick) return "other";
  if (boardingOrderIndex === null) return "other";
  return stop.orderIndex > boardingOrderIndex ? "candidate" : "upstream";
}

// Squared-degree distance threshold used to decide a stop is "off-route"
// (i.e. the agency-supplied polyline doesn't actually reach it). At Seattle
// latitudes this is roughly ~150m. When either endpoint of a segment is
// off-route we draw a straight line between the stop coordinates instead of
// walking the unrelated polyline geometry.
const OFF_ROUTE_THRESHOLD_DEG_SQ = 0.0015 ** 2;

function distSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// Find the polyline index closest to `point`. Returns { index, dSq }.
function nearestIndex(line, point) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < line.length; i++) {
    const d = distSq(line[i], point);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return { index: best, dSq: bestDist };
}

/**
 * Snap each stop to the nearest index on the polyline, then build one
 * segment per consecutive stop pair.
 *
 * Returns a sparse array of length `stopPositions.length - 1`. Each entry is
 * either:
 *   - an array of [lat, lon] points starting at stopA and ending at stopB
 *     (polyline geometry between them, with the real stop coords as
 *     endpoints so adjacent segments butt cleanly), OR
 *   - `null` when either endpoint is too far from the polyline
 *     (per OFF_ROUTE_THRESHOLD_DEG_SQ). We deliberately do NOT fabricate a
 *     straight line in that case — the agency polyline is the source of
 *     truth and a made-up line is more confusing than a visible gap.
 *
 * Callers should treat `null` as "no drawable geometry for this stop pair"
 * and skip it. The stop markers themselves are still rendered so the
 * underlying segment can be marked / clicked.
 */
export function slicePolylineByStops(line, stopPositions) {
  if (stopPositions.length < 2) return [];
  if (line.length === 0) {
    // No polyline at all → no segments are drawable.
    return new Array(stopPositions.length - 1).fill(null);
  }

  const snaps = stopPositions.map((sp) => nearestIndex(line, sp));

  const segments = [];
  for (let i = 0; i < snaps.length - 1; i++) {
    const a = snaps[i];
    const b = snaps[i + 1];
    const aOff = a.dSq > OFF_ROUTE_THRESHOLD_DEG_SQ;
    const bOff = b.dSq > OFF_ROUTE_THRESHOLD_DEG_SQ;

    if (aOff || bOff) {
      segments.push(null);
      continue;
    }

    // Strictly-backwards snap means one of the stops is on a different
    // part of the polyline than its order suggests (e.g. a malformed
    // trailing stop that happens to be close to a mid-route vertex).
    // Drawing the slice would paint a long wrong-direction line across
    // the map. Skip rather than fabricate. Equal indices are allowed so
    // densely-spaced stops sharing a vertex still render.
    if (b.index < a.index) {
      segments.push(null);
      continue;
    }

    const start = a.index;
    const end = b.index;
    // Use the real stop coordinates as endpoints so adjacent segments butt
    // exactly together with no visual gap from snap rounding.
    segments.push([
      stopPositions[i],
      ...line.slice(start + 1, end),
      stopPositions[i + 1],
    ]);
  }
  return segments;
}
