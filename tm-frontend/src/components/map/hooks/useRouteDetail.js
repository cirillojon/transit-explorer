import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRouteDetail, invalidateCache } from "../../../services/api";
import { normalizeDirectionId } from "../mapUtils";

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
    if (!routeDetail?.id) return;
    try {
      invalidateCache(`route:${routeDetail.id}`);
      const fresh = await fetchRouteDetail(routeDetail.id);
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
