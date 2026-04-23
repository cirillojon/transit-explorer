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
// off-route we return `null` for that segment rather than fabricating a
// straight line through unrelated geometry — the agency polyline is the
// source of truth and a made-up line is more confusing than a visible gap.
const OFF_ROUTE_THRESHOLD_DEG_SQ = 0.0015 ** 2;

function distSq(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

// Squared perpendicular distance from `point` to the segment a→b.
// Treats lat/lon as planar — fine for the small-area off-route check.
function pointToSegmentDistSq(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distSq(point, a);
  let t = ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / len2;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  const projX = a[0] + t * dx;
  const projY = a[1] + t * dy;
  return (point[0] - projX) ** 2 + (point[1] - projY) ** 2;
}

// Find the polyline vertex index closest to `point`. Returns the vertex
// index plus the squared perpendicular distance to the *polyline itself*
// (not just to the nearest vertex). Using perpendicular distance for the
// off-route check matters for routes like rail/Sounder where vertices can
// be kilometers apart along a straight stretch — a station sitting right
// on the line can still be far from any single vertex.
function nearestIndex(line, point) {
  let bestIdx = 0;
  let bestVertexDist = Infinity;
  for (let i = 0; i < line.length; i++) {
    const d = distSq(line[i], point);
    if (d < bestVertexDist) {
      bestVertexDist = d;
      bestIdx = i;
    }
  }
  let bestSegDist = bestVertexDist;
  for (let i = 0; i < line.length - 1; i++) {
    const d = pointToSegmentDistSq(point, line[i], line[i + 1]);
    if (d < bestSegDist) bestSegDist = d;
  }
  return { index: bestIdx, dSq: bestSegDist };
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
 * and skip rendering it. The stop markers themselves are still rendered so
 * users can board/alight at those stops, but the hop between them won't
 * have a clickable polyline.
 */
export function slicePolylineByStops(line, stopPositions) {
  return slicePolylineByStopsWithFallbacks(line, [], stopPositions);
}

/**
 * Slice geometry for one stop pair against a single polyline using
 * pre-computed snap results.
 *
 * `snapA` / `snapB` come from `nearestIndex(line, stopPositions[i])` and
 * are cached per (polyline, stop) so we don't re-scan the full polyline
 * for every hop and every fallback.
 *
 * `allowReverse` controls what happens when stopB snaps to an EARLIER
 * polyline index than stopA. For the direction's own polyline this means
 * the data is malformed (a stop is in the wrong place in stop_ids) and we
 * skip rather than draw a long wrong-direction line. For a fallback
 * polyline from the OPPOSITE direction, reverse-order is expected — both
 * polylines trace the same physical track from opposite ends — so we walk
 * the slice backwards and the result still flows from stopA to stopB.
 */
function sliceOneStopPair(line, pa, pb, snapA, snapB, allowReverse) {
  if (!line || line.length === 0) return null;
  if (
    snapA.dSq > OFF_ROUTE_THRESHOLD_DEG_SQ ||
    snapB.dSq > OFF_ROUTE_THRESHOLD_DEG_SQ
  ) {
    return null;
  }
  if (snapB.index < snapA.index) {
    if (!allowReverse) return null;
    // Walk the polyline backwards between the two snaps so the resulting
    // points still flow stopA -> stopB visually.
    const mid = line.slice(snapB.index + 1, snapA.index).reverse();
    return [pa, ...mid, pb];
  }
  return [pa, ...line.slice(snapA.index + 1, snapB.index), pb];
}

/**
 * Like `slicePolylineByStops`, but with a list of fallback polylines that
 * are tried (in order, allowing reverse traversal) when the primary
 * polyline can't render a hop. This handles the case where one direction's
 * polyline is truncated or missing — e.g. on Sound Transit's 1 Line, OBA
 * returns a complete polyline for the southbound direction but a truncated
 * one for the northbound direction that doesn't reach the southern stops.
 * Both directions trace the same physical track, so we can fall back to
 * the other direction's polyline to keep stops visually connected.
 */
export function slicePolylineByStopsWithFallbacks(
  primaryLine,
  fallbackLines,
  stopPositions,
) {
  if (stopPositions.length < 2) return [];
  const safeFallbacks = (fallbackLines || []).filter((l) => l && l.length > 0);
  if (
    (!primaryLine || primaryLine.length === 0) &&
    safeFallbacks.length === 0
  ) {
    // No geometry at all → nothing is drawable.
    return new Array(stopPositions.length - 1).fill(null);
  }

  // Snap each stop ONCE per polyline up front. `nearestIndex` scans the
  // full polyline, so without caching we'd pay that cost twice per hop
  // (once per endpoint) and again for every fallback line — quadratic-ish
  // in the number of stops on long routes. With caching it's O(stops × lines).
  const snapPrimary =
    primaryLine && primaryLine.length > 0
      ? stopPositions.map((sp) => nearestIndex(primaryLine, sp))
      : null;
  const snapFallbacks = safeFallbacks.map((line) =>
    stopPositions.map((sp) => nearestIndex(line, sp)),
  );

  const segments = [];
  for (let i = 0; i < stopPositions.length - 1; i++) {
    const pa = stopPositions[i];
    const pb = stopPositions[i + 1];
    let seg = null;
    if (snapPrimary) {
      seg = sliceOneStopPair(
        primaryLine,
        pa,
        pb,
        snapPrimary[i],
        snapPrimary[i + 1],
        false,
      );
    }
    if (seg === null) {
      for (let f = 0; f < safeFallbacks.length; f++) {
        seg = sliceOneStopPair(
          safeFallbacks[f],
          pa,
          pb,
          snapFallbacks[f][i],
          snapFallbacks[f][i + 1],
          true,
        );
        if (seg !== null) break;
      }
    }
    segments.push(seg);
  }
  return segments;
}
