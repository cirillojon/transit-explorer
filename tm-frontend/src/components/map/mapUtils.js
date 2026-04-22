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

/* Snap each stop to the nearest index on the polyline, then slice. */
export function slicePolylineByStops(line, stopPositions) {
  if (line.length === 0 || stopPositions.length < 2) return [];
  const indices = stopPositions.map((sp) => {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < line.length; i++) {
      const d = (line[i][0] - sp[0]) ** 2 + (line[i][1] - sp[1]) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  });
  const segments = [];
  for (let i = 0; i < indices.length - 1; i++) {
    const start = Math.min(indices[i], indices[i + 1]);
    const end = Math.max(indices[i], indices[i + 1]);
    segments.push(line.slice(start, end + 1));
  }
  return segments;
}
