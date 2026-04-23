import { useCallback, useEffect, useMemo, useState } from "react";
import {
  decode,
  normalizeDirectionId,
  slicePolylineByStopsWithFallbacks,
} from "../mapUtils";

// Cache decoded "view all routes" segments per route-detail object.
// `fetchRouteDetail` returns the same object across its 5-minute cache
// window, so toggling the all-routes view (or refreshing one route while
// keeping others) won't redo the expensive polyline decode + slice for
// every route.
const allRouteSegmentsByDetail = new WeakMap();

function buildAllRouteSegmentsForDetail(detail) {
  const result = [];
  const color = detail.color ? `#${detail.color}` : "#60a5fa";
  // Decode every polyline variant up front. See useDirectionGeometry for
  // the full rationale — same multi-variant fallback chain applies here
  // for all-routes mode.
  const decodedByDir = new Map();
  for (const dir of detail.directions || []) {
    const dirId = normalizeDirectionId(dir.direction_id);
    const variants = dir.encoded_polylines?.length
      ? dir.encoded_polylines
      : dir.encoded_polyline
        ? [dir.encoded_polyline]
        : [];
    const decoded = variants
      .map((enc) => decode(enc))
      .filter((line) => line && line.length > 0);
    decodedByDir.set(dirId, decoded);
  }
  for (const dir of detail.directions || []) {
    const dirId = normalizeDirectionId(dir.direction_id);
    const ownVariants = decodedByDir.get(dirId) || [];
    const line = ownVariants[0] || [];
    const fallbackLines = [];
    for (let v = 1; v < ownVariants.length; v++) {
      fallbackLines.push(ownVariants[v]);
    }
    for (const [otherId, otherVariants] of decodedByDir) {
      if (otherId === dirId) continue;
      for (const otherLine of otherVariants) {
        fallbackLines.push(otherLine);
      }
    }
    const stopIds = dir.stop_ids || [];
    const stopsMap = detail.stops || {};
    const filteredStopIds = stopIds.filter((id) => Boolean(stopsMap[id]));
    const stopPositions = filteredStopIds.map((id) => {
      const stop = stopsMap[id];
      return [stop.lat, stop.lon];
    });
    const polySegs = slicePolylineByStopsWithFallbacks(
      line,
      fallbackLines,
      stopPositions,
    );
    const segmentCount = Math.min(
      polySegs.length,
      Math.max(0, filteredStopIds.length - 1),
    );
    for (let i = 0; i < segmentCount; i++) {
      result.push({
        routeId: detail.id,
        directionId: dir.direction_id,
        fromStopId: filteredStopIds[i],
        toStopId: filteredStopIds[i + 1],
        positions: polySegs[i],
        color,
        key: `${detail.id}|${dir.direction_id}|${filteredStopIds[i]}|${filteredStopIds[i + 1]}`,
      });
    }
  }
  return result;
}

/**
 * Manages the "view all in-progress routes" overlay: per-route polylines,
 * fitBounds positions, hide-route + ridden-only filters, and per-route
 * completion stats.
 *
 * Returns a single bag of derived data + filter handlers. Filters auto-
 * reset when the underlying route set changes so stale ids don't linger.
 */
export default function useAllRoutesView(
  allProgressDetails,
  selectedRoute,
  effectiveCompleted,
) {
  const [hiddenRouteIds, setHiddenRouteIds] = useState(() => new Set());
  const [riddenOnly, setRiddenOnly] = useState(false);

  const allRouteSegments = useMemo(() => {
    if (!allProgressDetails?.length || selectedRoute) return [];
    const result = [];
    for (const detail of allProgressDetails) {
      const cached = allRouteSegmentsByDetail.get(detail);
      if (cached) {
        for (const seg of cached) result.push(seg);
        continue;
      }
      const segs = buildAllRouteSegmentsForDetail(detail);
      allRouteSegmentsByDetail.set(detail, segs);
      for (const seg of segs) result.push(seg);
    }
    return result;
  }, [allProgressDetails, selectedRoute]);

  const allProgressPositions = useMemo(
    () => allRouteSegments.flatMap((s) => (s.positions ? s.positions : [])),
    [allRouteSegments],
  );

  // Reset hide/ridden-only filters when entering or leaving all-routes
  // mode, or when the underlying route set changes.
  const allProgressIdsKey = useMemo(
    () =>
      allProgressDetails
        ? allProgressDetails
            .map((d) => d.id)
            .sort()
            .join("|")
        : "",
    [allProgressDetails],
  );
  useEffect(() => {
    setHiddenRouteIds(new Set());
    setRiddenOnly(false);
  }, [allProgressIdsKey]);

  const visibleAllRouteSegments = useMemo(() => {
    if (!allRouteSegments.length) return allRouteSegments;
    return allRouteSegments.filter((seg) => {
      if (hiddenRouteIds.has(seg.routeId)) return false;
      if (riddenOnly && !effectiveCompleted.has(seg.key)) return false;
      return true;
    });
  }, [allRouteSegments, hiddenRouteIds, riddenOnly, effectiveCompleted]);

  const toggleHiddenRoute = useCallback((routeId) => {
    setHiddenRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  }, []);

  const showAllRoutes = useCallback(() => setHiddenRouteIds(new Set()), []);
  const toggleRiddenOnly = useCallback(() => setRiddenOnly((v) => !v), []);

  const allRouteStats = useMemo(() => {
    if (!allProgressDetails?.length) return [];
    const totalsMap = new Map();
    for (const seg of allRouteSegments) {
      if (!totalsMap.has(seg.routeId)) {
        totalsMap.set(seg.routeId, { total: 0, done: 0 });
      }
      const entry = totalsMap.get(seg.routeId);
      entry.total += 1;
      if (effectiveCompleted.has(seg.key)) entry.done += 1;
    }
    return allProgressDetails.map((detail) => {
      const counts = totalsMap.get(detail.id) || { total: 0, done: 0 };
      const pct =
        counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
      const name = detail.short_name || detail.long_name || detail.id;
      const color = detail.color ? `#${detail.color}` : "#60a5fa";
      return { id: detail.id, name, color, pct };
    });
  }, [allProgressDetails, allRouteSegments, effectiveCompleted]);

  const allRouteStatsById = useMemo(
    () => new Map(allRouteStats.map((r) => [r.id, r])),
    [allRouteStats],
  );

  return {
    allRouteSegments,
    visibleAllRouteSegments,
    allProgressPositions,
    allRouteStats,
    allRouteStatsById,
    hiddenRouteIds,
    riddenOnly,
    toggleHiddenRoute,
    showAllRoutes,
    toggleRiddenOnly,
  };
}
