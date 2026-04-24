import { useMemo } from "react";
import {
  decode,
  normalizeDirectionId,
  slicePolylineByStopsWithFallbacks,
} from "../mapUtils";

/**
 * Derives all polyline + stop geometry for the currently active direction
 * of a single route. Pure derivation — no state, no effects.
 *
 * Exposes:
 * - `directionSegments` — one entry per consecutive stop pair in the
 *   active direction, with per-hop `positions` (or `null` when the
 *   slicer can't draw it). Also includes the segment `key` used for
 *   completion lookup.
 * - `directionShapes`   — full decoded polyline variants for the active
 *   direction, used as a faint backdrop so the route shape stays
 *   continuous even where per-stop slicing can't bridge a trip-pattern
 *   variant boundary.
 * - `visibleStops`      — flat list of stops in the active direction,
 *   tagged with `directionId` / `isTerminus` / `orderIndex`.
 * - `allSelectedPositions` — every drawable lat/lon for fitBounds.
 * - `highlightPositions`   — drawable positions for the externally
 *   requested highlight, or `null`.
 *
 * Decoding every polyline variant once per `routeDetail` (rather than
 * inside both `directionSegments` and `directionShapes` separately) is
 * the main perf win here — one direction can carry 6+ trip-pattern
 * variants and each `decode()` is non-trivial.
 */
export default function useDirectionGeometry(
  routeDetail,
  resolvedDirectionId,
  highlightedSegment,
) {
  // Decode every polyline variant exactly once per `routeDetail`. OBA
  // returns one polyline per *trip-pattern variant* per direction
  // (deviations, short-turns, "Summit" tail on Route 3, etc.); the
  // backend persists the full list as `encoded_polylines`.
  const decodedVariantsByDir = useMemo(() => {
    const out = new Map();
    if (!routeDetail) return out;
    for (const dir of routeDetail.directions || []) {
      const dirId = normalizeDirectionId(dir.direction_id);
      const variants = dir.encoded_polylines?.length
        ? dir.encoded_polylines
        : dir.encoded_polyline
          ? [dir.encoded_polyline]
          : [];
      const decoded = variants
        .map((enc) => decode(enc))
        .filter((line) => line && line.length > 0);
      out.set(dirId, decoded);
    }
    return out;
  }, [routeDetail]);

  const directionSegments = useMemo(() => {
    if (!routeDetail) return [];
    const result = [];
    // Treat the direction's own first variant as primary, then fall back
    // through:
    //   1. its OTHER same-direction variants (covers minor patterns
    //      like Route 3's Summit deviation that aren't on the main line),
    //   2. all opposite-direction variants (both directions trace the
    //      same physical track from opposite ends — already handled by
    //      `slicePolylineByStopsWithFallbacks` with reverse traversal).
    const decodedByDir = decodedVariantsByDir;
    for (const dir of routeDetail.directions || []) {
      if (
        resolvedDirectionId !== null &&
        normalizeDirectionId(dir.direction_id) !== resolvedDirectionId
      )
        continue;
      const dirId = normalizeDirectionId(dir.direction_id);
      const ownVariants = decodedByDir.get(dirId) || [];
      const line = ownVariants[0] || [];
      const fallbackLines = [];
      // Same-direction variants come first — they're the most likely
      // match for any deviation stop in this direction's stop list.
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
      const stopsMap = routeDetail.stops || {};
      // Filter stopIds and stopPositions in parallel so segment indices
      // stay aligned with the surviving stop IDs (otherwise polySegments[i]
      // would no longer correspond to fromStopId/toStopId at the same i).
      const filteredStopIds = stopIds.filter((id) => Boolean(stopsMap[id]));
      const stopPositions = filteredStopIds.map((id) => {
        const stop = stopsMap[id];
        return [stop.lat, stop.lon];
      });
      const polySegments = slicePolylineByStopsWithFallbacks(
        line,
        fallbackLines,
        stopPositions,
      );
      const segmentCount = Math.min(
        polySegments.length,
        Math.max(0, filteredStopIds.length - 1),
      );
      for (let i = 0; i < segmentCount; i++) {
        // Always emit a segment object — one per backend stop pair — so
        // completion stats and highlight lookup remain accurate even
        // when the agency polyline doesn't have drawable geometry for
        // the hop. `positions` is `null` for non-drawable hops;
        // renderers skip those rather than fabricating a line.
        result.push({
          directionId: normalizeDirectionId(dir.direction_id),
          fromStopId: filteredStopIds[i],
          toStopId: filteredStopIds[i + 1],
          fromName: stopsMap[filteredStopIds[i]]?.name,
          toName: stopsMap[filteredStopIds[i + 1]]?.name,
          positions: polySegments[i],
          key: `${routeDetail.id}|${normalizeDirectionId(dir.direction_id)}|${filteredStopIds[i]}|${filteredStopIds[i + 1]}`,
        });
      }
    }
    return result;
  }, [routeDetail, resolvedDirectionId, decodedVariantsByDir]);

  const directionShapes = useMemo(() => {
    if (!routeDetail) return [];
    const shapes = [];
    for (const dir of routeDetail.directions || []) {
      if (
        resolvedDirectionId !== null &&
        normalizeDirectionId(dir.direction_id) !== resolvedDirectionId
      )
        continue;
      const dirId = normalizeDirectionId(dir.direction_id);
      const decoded = decodedVariantsByDir.get(dirId) || [];
      decoded.forEach((line, i) => {
        if (line.length < 2) return;
        shapes.push({
          key: `${routeDetail.id}|${dirId}|shape|${i}`,
          positions: line,
        });
      });
    }
    return shapes;
  }, [routeDetail, resolvedDirectionId, decodedVariantsByDir]);

  const allSelectedPositions = useMemo(
    () => [
      ...directionSegments.flatMap((s) => (s.positions ? s.positions : [])),
      ...directionShapes.flatMap((s) => s.positions),
    ],
    [directionSegments, directionShapes],
  );

  const visibleStops = useMemo(() => {
    if (!routeDetail) return [];
    const stopsMap = routeDetail.stops || {};
    const result = [];
    const seen = new Set();
    for (const dir of routeDetail.directions || []) {
      if (
        resolvedDirectionId !== null &&
        normalizeDirectionId(dir.direction_id) !== resolvedDirectionId
      )
        continue;
      const ids = dir.stop_ids || [];
      ids.forEach((stopId, idx) => {
        if (seen.has(stopId)) return;
        seen.add(stopId);
        const stop = stopsMap[stopId];
        if (stop) {
          result.push({
            ...stop,
            directionId: normalizeDirectionId(dir.direction_id),
            isTerminus: idx === 0 || idx === ids.length - 1,
            orderIndex: idx,
          });
        }
      });
    }
    return result;
  }, [routeDetail, resolvedDirectionId]);

  const highlightPositions = useMemo(() => {
    if (!highlightedSegment) return null;
    const key = `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
    const seg = directionSegments.find((s) => s.key === key);
    // Return a fresh array each time so FitHighlight's effect fires even
    // when the user re-requests the same segment (e.g. "Recenter"). If
    // the segment exists but has no drawable polyline, there's nothing
    // to fit.
    return seg && seg.positions ? [...seg.positions] : null;
  }, [highlightedSegment, directionSegments]);

  return {
    directionSegments,
    directionShapes,
    allSelectedPositions,
    visibleStops,
    highlightPositions,
  };
}
