import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRouteDetail, invalidateCache } from "../../../services/api";
import { normalizeDirectionId } from "../mapUtils";

// Pick a compass-style arrow for a direction, biased toward N/S.
//
// Most transit lines run roughly north–south or east–west, but real bus
// routes wander, so a strict 8-way compass split puts a lot of mostly-
// vertical routes onto a diagonal arrow. We widen the N/S sectors to
// ~80° each and shrink the E/W sectors to ~30° so anything that's
// "mostly down" reads as ↓.
//
// Falls back to keyword detection on the agency-supplied direction name
// when stops don't have coordinates.
function directionArrowFromStops(firstStop, lastStop, label) {
  const lat1 = firstStop?.lat;
  const lon1 = firstStop?.lon;
  const lat2 = lastStop?.lat;
  const lon2 = lastStop?.lon;
  const haveCoords = [lat1, lon1, lat2, lon2].every(
    (v) => typeof v === "number" && Number.isFinite(v),
  );
  if (haveCoords) {
    const dy = lat2 - lat1; // +north
    // Correct longitude for latitude so a degree of lon ~ a degree of lat.
    const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
    const dx = (lon2 - lon1) * Math.cos(meanLatRad); // +east
    if (Math.abs(dx) > 1e-9 || Math.abs(dy) > 1e-9) {
      // Angle from north, in degrees, 0..180. Sign of dx picks E vs W.
      const angle = (Math.atan2(Math.abs(dx), dy) * 180) / Math.PI;
      const east = dx >= 0;
      // N/S sectors: ±40° around N (0) and ±40° around S (180).
      // E/W sectors: 75°–105° from north.
      // Diagonals fill the gaps (40°–75° and 105°–140°).
      if (angle <= 40) return "↑";
      if (angle >= 140) return "↓";
      if (angle >= 75 && angle <= 105) return east ? "→" : "←";
      if (angle < 75) return east ? "↗" : "↖";
      return east ? "↘" : "↙";
    }
  }
  // Keyword fallback when geometry is missing or degenerate.
  const text = (label || "").toLowerCase();
  const has = (...words) => words.some((w) => text.includes(w));
  if (has("north", "northbound", " nb", "n-bound")) return "↑";
  if (has("south", "southbound", " sb", "s-bound")) return "↓";
  if (has("east", "eastbound", " eb", "e-bound")) return "→";
  if (has("west", "westbound", " wb", "w-bound")) return "←";
  if (has("inbound", "downtown", "uptown bound")) return "→";
  if (has("outbound")) return "←";
  if (has("up")) return "↑";
  if (has("down")) return "↓";
  return null;
}

/**
 * Loads the full detail payload for the currently selected route and
 * tracks which direction the UI is focused on.
 *
 * Also exposes:
 * - `directionChoices`     — UI metadata for the direction tabs
 * - `resolvedDirectionId`  — `activeDirection` falling back to the first
 *                            direction in the payload
 * - `activeDirectionMeta`  — full choice object for the resolved id
 * - `refreshAfterValidationError(preferredDirectionId)` — invalidates the
 *   per-route cache and refetches; used after the backend rejects a mark
 *   because the cached route shape is stale.
 *
 * Selecting a different route or clearing the selection clears
 * `routeDetail` immediately so stale stops never paint over the new map.
 * The `onLoadError` callback is invoked once if the fetch rejects.
 */
export default function useRouteDetail(selectedRoute, { onLoadError } = {}) {
  const [routeDetail, setRouteDetail] = useState(null);
  const [activeDirection, setActiveDirection] = useState(null);

  // Keep the latest onLoadError in a ref so the fetch effect doesn't
  // need it in its deps — otherwise an inline arrow from the caller
  // would re-trigger the fetch on every render.
  const onLoadErrorRef = useRef(onLoadError);
  useEffect(() => {
    onLoadErrorRef.current = onLoadError;
  }, [onLoadError]);

  // Track the currently selected route id and mounted state so the async
  // `refreshAfterValidationError` path can bail out if the user switches
  // routes (or unmounts) mid-fetch.
  const selectedRouteIdRef = useRef(selectedRoute?.id ?? null);
  useEffect(() => {
    selectedRouteIdRef.current = selectedRoute?.id ?? null;
  }, [selectedRoute]);
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!selectedRoute) {
      setRouteDetail(null);
      setActiveDirection(null);
      return undefined;
    }
    let cancelled = false;
    setRouteDetail(null);
    fetchRouteDetail(selectedRoute.id)
      .then((data) => {
        if (cancelled) return;
        setRouteDetail(data);
        if (data.directions?.length > 0) {
          setActiveDirection(
            normalizeDirectionId(data.directions[0].direction_id),
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        onLoadErrorRef.current?.();
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoute]);

  const directionChoices = useMemo(() => {
    if (!routeDetail?.directions?.length) return [];
    const stopsMap = routeDetail.stops || {};
    return routeDetail.directions.map((dir) => {
      const ids = dir.stop_ids || [];
      const firstStop = ids[0] ? stopsMap[ids[0]] : null;
      const lastStop = ids.length ? stopsMap[ids[ids.length - 1]] : null;
      return {
        directionId: normalizeDirectionId(dir.direction_id),
        label: dir.direction_name || `Direction ${dir.direction_id}`,
        firstStopName: firstStop?.name || null,
        lastStopName: lastStop?.name || null,
        arrow: directionArrowFromStops(firstStop, lastStop, dir.direction_name),
      };
    });
  }, [routeDetail]);

  const resolvedDirectionId = useMemo(() => {
    if (!directionChoices.length) return null;
    if (activeDirection != null) return normalizeDirectionId(activeDirection);
    return directionChoices[0].directionId;
  }, [directionChoices, activeDirection]);

  const activeDirectionMeta = useMemo(
    () =>
      directionChoices.find((dir) => dir.directionId === resolvedDirectionId) ||
      directionChoices[0] ||
      null,
    [directionChoices, resolvedDirectionId],
  );

  const refreshAfterValidationError = async (preferredDirectionId) => {
    const targetId = routeDetail?.id;
    if (!targetId) return;
    try {
      invalidateCache(`route:${targetId}`);
      const fresh = await fetchRouteDetail(targetId);
      // Bail if the user switched routes (or the hook unmounted) while
      // the refetch was in flight — otherwise we'd paint stale data
      // belonging to the previous route.
      if (!mountedRef.current) return;
      if (selectedRouteIdRef.current !== targetId) return;
      setRouteDetail(fresh);
      const fallbackDirection =
        normalizeDirectionId(preferredDirectionId) ||
        normalizeDirectionId(fresh.directions?.[0]?.direction_id);
      setActiveDirection(fallbackDirection);
    } catch {
      // If refresh fails we keep existing data and show the original
      // error toast.
    }
  };

  return {
    routeDetail,
    activeDirection,
    setActiveDirection,
    directionChoices,
    resolvedDirectionId,
    activeDirectionMeta,
    refreshAfterValidationError,
  };
}
