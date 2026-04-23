import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import L from "leaflet";
import {
  fetchRouteDetail,
  invalidateCache,
  markSegments,
} from "../services/api";
import HelpModal from "./HelpModal";
import { FitBounds, FitHighlight } from "./map/FitBounds";
import StopSearch from "./map/StopSearch";
import DirectionTabs from "./map/DirectionTabs";
import MapLegend from "./map/MapLegend";
import AllRoutesBanner from "./map/AllRoutesBanner";
import PickOverlay from "./map/PickOverlay";
import RouteSegmentsLayer from "./map/RouteSegmentsLayer";
import AllRouteSegmentsLayer from "./map/AllRouteSegmentsLayer";
import StopMarkersLayer from "./map/StopMarkersLayer";
import {
  SEATTLE_CENTER,
  HELP_SEEN_KEY,
  decode,
  formatDuration,
  getTripStats,
  normalizeDirectionId,
  recordTripTime,
  slicePolylineByStopsWithFallbacks,
} from "./map/mapUtils";

// Cache decoded "view all routes" segments per route-detail object.
// `fetchRouteDetail` returns the same object across its 5-minute cache
// window, so toggling the all-routes view (or refreshing one route while
// keeping others) won't redo the expensive polyline decode + slice for
// every route.
const allRouteSegmentsByDetail = new WeakMap();

function buildAllRouteSegmentsForDetail(detail) {
  const result = [];
  const color = detail.color ? `#${detail.color}` : "#60a5fa";
  // Decode every polyline variant up front. See
  // TransitMap.directionSegments for the full rationale — same
  // multi-variant fallback chain applies here for all-routes mode.
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
    // Filter stopIds and stopPositions in parallel so segment indices
    // stay aligned with the surviving stop IDs.
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
      // Always emit a segment object so per-route progress totals are
      // based on real backend hops, not on which ones happen to have
      // drawable polyline geometry. `positions` is `null` for hops the
      // renderer should skip.
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

function TransitMap({
  selectedRoute,
  completedSegments,
  onSegmentsMarked,
  highlightedSegment,
  onClearHighlight,
  onUnlockToast,
  allProgressDetails,
  onClearAllProgress,
}) {
  const [routeDetail, setRouteDetail] = useState(null);
  const [marking, setMarking] = useState(false);
  const [pickState, setPickState] = useState(null);
  const [activeDirection, setActiveDirection] = useState(null);
  const [toast, setToast] = useState(null);
  const [hoverSeg, setHoverSeg] = useState(null);
  const [stopSearch, setStopSearch] = useState("");
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [optimisticDone, setOptimisticDone] = useState(() => new Set());
  const [recentlyDone, setRecentlyDone] = useState(() => new Set());
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpAutoOpened, setHelpAutoOpened] = useState(false);
  const [tripStatsTick, setTripStatsTick] = useState(0); // bumps to refresh avg
  const [liveTripMs, setLiveTripMs] = useState(0);
  // Per-route hide toggles + ridden-only filter for "view all routes" mode.
  const [hiddenAllRouteIds, setHiddenAllRouteIds] = useState(() => new Set());
  const [allRoutesRiddenOnly, setAllRoutesRiddenOnly] = useState(false);
  const toastTimerRef = useRef(null);
  const completedTimerRef = useRef(null);
  const recentTimerRef = useRef(null);
  const liveTimerRef = useRef(null);
  const mapRef = useRef(null);
  const stopMarkerRefs = useRef({});
  const isMobile =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 800px)").matches;

  const boardingIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: '<div class="boarding-marker"><div class="boarding-pulse-ring"></div></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    [],
  );

  const showToast = useCallback((msg, kind = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    },
    [],
  );

  // First-visit help: show the modal automatically until the user dismisses
  // it once. After that they can re-open it with the "?" button on the map.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(HELP_SEEN_KEY);
      if (!seen) {
        setHelpAutoOpened(true);
        setHelpOpen(true);
      }
    } catch {
      /* localStorage disabled — skip auto-open */
    }
  }, []);

  // Live "elapsed since boarding" counter that drives the on-bus timer
  // shown in the pick overlay. Only runs while a boarding pick is active.
  useEffect(() => {
    if (liveTimerRef.current) {
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (pickState?.boardedAt) {
      setLiveTripMs(Date.now() - pickState.boardedAt);
      liveTimerRef.current = setInterval(() => {
        setLiveTripMs(Date.now() - pickState.boardedAt);
      }, 1000);
    } else {
      setLiveTripMs(0);
    }
    return () => {
      if (liveTimerRef.current) {
        clearInterval(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    };
  }, [pickState]);

  // On phones, auto-collapse the legend when the user is mid-pick so the
  // bottom pick prompt doesn't fight with the legend's step list for space.
  useEffect(() => {
    if (!isMobile) return;
    if (pickState) setLegendCollapsed(true);
  }, [pickState, isMobile]);

  // Load full detail when a route is selected
  useEffect(() => {
    if (!selectedRoute) {
      setRouteDetail(null);
      setPickState(null);
      setActiveDirection(null);
      return;
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
      .catch(() => !cancelled && showToast("Could not load route", "error"));
    return () => {
      cancelled = true;
    };
  }, [selectedRoute]);

  // Sync direction when a highlighted segment is requested from outside
  useEffect(() => {
    if (
      highlightedSegment &&
      routeDetail &&
      highlightedSegment.routeId === routeDetail.id
    ) {
      setActiveDirection(normalizeDirectionId(highlightedSegment.directionId));
    }
  }, [highlightedSegment, routeDetail]);

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

  // Decode every polyline variant exactly once per `routeDetail`. OBA
  // returns one polyline per *trip-pattern variant* per direction
  // (deviations, short-turns, "Summit" tail on Route 3, etc.); the
  // backend persists the full list as `encoded_polylines`. Both
  // `directionSegments` (per-hop slicer + fallback chain) and
  // `directionShapes` (faint full-route backdrop) consume this map, so
  // computing it separately in each was decoding everything twice.
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
        // completion stats and highlight lookup remain accurate even when
        // the agency polyline doesn't have drawable geometry for the hop.
        // `positions` is `null` for non-drawable hops; renderers skip
        // those rather than fabricating a line.
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

  // Decoded full polyline variants for the active direction(s). These get
  // rendered as a thin low-opacity backdrop so the route geometry is
  // always visually continuous, even when our per-stop slicer can't find
  // a single polyline that covers a hop at a trip-pattern variant
  // boundary. The colored per-hop segments still sit on top for the
  // traveled/untraveled coloring; we just refuse to leave physical gaps
  // in the route shape itself.
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

  // When boarded, the boarding stop's index in the active direction tells us
  // which other stops are *downstream* (valid) vs *upstream* (would be a
  // backwards trip on a one-way direction).
  const boardingOrderIndex = useMemo(() => {
    if (!pickState) return null;
    const boarding = visibleStops.find(
      (s) =>
        s.id === pickState.fromStopId &&
        s.directionId === pickState.directionId,
    );
    return boarding ? boarding.orderIndex : null;
  }, [pickState, visibleStops]);

  const highlightPositions = useMemo(() => {
    if (!highlightedSegment) return null;
    const key = `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
    const seg = directionSegments.find((s) => s.key === key);
    // Return a fresh array each time so FitHighlight's effect fires even
    // when the user re-requests the same segment (e.g. "Recenter"). If the
    // segment exists but has no drawable polyline, there's nothing to fit.
    return seg && seg.positions ? [...seg.positions] : null;
  }, [highlightedSegment, directionSegments]);

  // Reset optimistic completion state whenever the selected route changes.
  useEffect(() => {
    setOptimisticDone(new Set());
    setRecentlyDone(new Set());
  }, [selectedRoute]);

  // Drop optimistic keys once the server-confirmed prop set covers them.
  useEffect(() => {
    if (optimisticDone.size === 0) return;
    let changed = false;
    const next = new Set();
    for (const key of optimisticDone) {
      if (!completedSegments.has(key)) {
        next.add(key);
      } else {
        changed = true;
      }
    }
    if (changed) setOptimisticDone(next);
  }, [completedSegments, optimisticDone]);

  // The set the polylines actually paint against. Server truth ∪ optimistic.
  const effectiveCompleted = useMemo(() => {
    if (optimisticDone.size === 0) return completedSegments;
    const merged = new Set(completedSegments);
    for (const k of optimisticDone) merged.add(k);
    return merged;
  }, [completedSegments, optimisticDone]);

  // Segments for all in-progress routes, used in "view all routes" mode.
  //
  // Per-route decoding is cached in a module-level WeakMap keyed on the
  // detail object reference. `fetchRouteDetail` already returns the same
  // object across its 5-minute cache window, so toggling "view all routes"
  // on/off (or refreshing one route while keeping others) won't re-decode
  // every polyline.
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

  // All positions across every in-progress route for fitting the map view.
  const allProgressPositions = useMemo(
    () => allRouteSegments.flatMap((s) => (s.positions ? s.positions : [])),
    [allRouteSegments],
  );

  // Reset hide/ridden-only filters when entering or leaving all-routes mode,
  // or when the underlying route set changes (so stale ids don't linger).
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
    setHiddenAllRouteIds(new Set());
    setAllRoutesRiddenOnly(false);
  }, [allProgressIdsKey]);

  // Apply the hide-route + ridden-only filters before rendering polylines.
  const visibleAllRouteSegments = useMemo(() => {
    if (!allRouteSegments.length) return allRouteSegments;
    return allRouteSegments.filter((seg) => {
      if (hiddenAllRouteIds.has(seg.routeId)) return false;
      if (allRoutesRiddenOnly && !effectiveCompleted.has(seg.key)) return false;
      return true;
    });
  }, [
    allRouteSegments,
    hiddenAllRouteIds,
    allRoutesRiddenOnly,
    effectiveCompleted,
  ]);

  const toggleHiddenAllRoute = useCallback((routeId) => {
    setHiddenAllRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(routeId)) next.delete(routeId);
      else next.add(routeId);
      return next;
    });
  }, []);

  const showAllAllRoutes = useCallback(
    () => setHiddenAllRouteIds(new Set()),
    [],
  );

  // Per-route completion stats for the "view all routes" legend.
  const allRouteStats = useMemo(() => {
    if (!allProgressDetails?.length) return [];
    // Build per-route totals in one pass over allRouteSegments.
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

  // Build a lookup map for O(1) access in the segment render loop.
  const allRouteStatsById = useMemo(
    () => new Map(allRouteStats.map((r) => [r.id, r])),
    [allRouteStats],
  );

  const completionStats = useMemo(() => {
    if (!directionSegments.length) return null;
    const done = directionSegments.filter((s) =>
      effectiveCompleted.has(s.key),
    ).length;
    return { done, total: directionSegments.length };
  }, [directionSegments, effectiveCompleted]);

  // Trip-time stats are stored client-side per (route, direction). We
  // depend on tripStatsTick so the legend re-reads localStorage after
  // each successful save.
  const tripStats = useMemo(() => {
    if (!routeDetail || resolvedDirectionId == null) return null;
    // Reference tripStatsTick so the lint rule sees it; the value isn't
    // used directly, it just forces a re-read after each save.
    void tripStatsTick;
    return getTripStats(routeDetail.id, resolvedDirectionId);
  }, [routeDetail, resolvedDirectionId, tripStatsTick]);

  const refreshRouteAfterValidationError = async (preferredDirectionId) => {
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
      // If refresh fails we keep existing data and show the original error toast.
    }
  };

  const submitMark = async (directionId, fromStopId, toStopId) => {
    if (!routeDetail) return;
    const normalizedDirectionId = normalizeDirectionId(directionId);

    // Capture trip-time + boarding context BEFORE we clear pickState so we
    // can record an accurate duration and pre-paint the segments green.
    const boardedAt = pickState?.boardedAt || null;
    const tripMs = boardedAt ? Date.now() - boardedAt : null;

    // Build the list of optimistic keys for the entire run from -> to. The
    // backend creates one segment per consecutive stop pair, so we mirror
    // that here so the line turns green immediately on click.
    const optimisticKeys = [];
    const dir = (routeDetail.directions || []).find(
      (d) => normalizeDirectionId(d.direction_id) === normalizedDirectionId,
    );
    if (!dir) {
      showToast("Direction changed. Please pick stops again.", "info");
      setPickState(null);
      refreshRouteAfterValidationError(normalizedDirectionId);
      return;
    }
    const ids = dir.stop_ids || [];
    const fromIdx = ids.indexOf(fromStopId);
    const toIdx = ids.indexOf(toStopId);
    if (fromIdx === -1 || toIdx === -1) {
      showToast(
        "Route data updated. Reloaded stops for this direction.",
        "info",
      );
      setPickState(null);
      refreshRouteAfterValidationError(normalizedDirectionId);
      return;
    }
    if (fromIdx >= toIdx) {
      showToast(
        "That stop is behind your boarding point — pick one ahead or change directions.",
        "info",
      );
      return;
    }

    for (let i = fromIdx; i < toIdx; i++) {
      optimisticKeys.push(
        `${routeDetail.id}|${normalizedDirectionId}|${ids[i]}|${ids[i + 1]}`,
      );
    }

    if (optimisticKeys.length) {
      setOptimisticDone((prev) => {
        const next = new Set(prev);
        for (const k of optimisticKeys) next.add(k);
        return next;
      });
      // Trigger the "just-turned-green" pulse animation.
      setRecentlyDone((prev) => {
        const next = new Set(prev);
        for (const k of optimisticKeys) next.add(k);
        return next;
      });
      if (recentTimerRef.current) clearTimeout(recentTimerRef.current);
      recentTimerRef.current = setTimeout(() => {
        setRecentlyDone(new Set());
        recentTimerRef.current = null;
      }, 1600);
    }

    setMarking(true);
    try {
      // Only send a duration to the server when we actually measured a
      // live boarding -> alighting trip (>5s). After-the-fact taps leave
      // duration_ms NULL on the new segment row.
      const sendDuration = tripMs && tripMs > 5000 ? tripMs : null;
      const result = await markSegments(
        routeDetail.id,
        normalizedDirectionId,
        fromStopId,
        toStopId,
        "",
        sendDuration,
      );
      setPickState(null);
      onSegmentsMarked(result);
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      if (created > 0) {
        // Persist the trip duration if we measured one (boarding was
        // tapped live, not after-the-fact).
        let tripMsg = "";
        if (tripMs && tripMs > 5000) {
          recordTripTime(routeDetail.id, normalizedDirectionId, tripMs);
          setTripStatsTick((t) => t + 1);
          const f = formatDuration(tripMs);
          if (f) tripMsg = ` · ${f} on bus`;
        }
        // Briefly mark step 3 as complete so the user sees the full
        // 1-2-3 progression before the legend snaps back to step 1.
        if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
        setJustCompleted(true);
        completedTimerRef.current = setTimeout(() => {
          setJustCompleted(false);
          completedTimerRef.current = null;
        }, 1600);
        showToast(
          `✓ Marked ${created} segment${created > 1 ? "s" : ""}` +
            (skipped ? ` · ${skipped} already done` : "") +
            tripMsg,
        );
      } else {
        showToast("All hops already marked", "info");
      }
      if (result.new_achievements?.length && onUnlockToast) {
        result.new_achievements.forEach((a) =>
          onUnlockToast(`${a.icon} ${a.label} unlocked!`),
        );
      }
    } catch (err) {
      if (
        err?.status === 400 &&
        typeof err?.message === "string" &&
        err.message.includes("not on this route/direction")
      ) {
        setPickState(null);
        refreshRouteAfterValidationError(normalizedDirectionId);
      }

      // Roll back the optimistic paint if the server rejected the mark.
      if (optimisticKeys.length) {
        setOptimisticDone((prev) => {
          const next = new Set(prev);
          for (const k of optimisticKeys) next.delete(k);
          return next;
        });
        setRecentlyDone((prev) => {
          const next = new Set(prev);
          for (const k of optimisticKeys) next.delete(k);
          return next;
        });
      }
      showToast(err.message || "Could not save segment", "error");
    } finally {
      setMarking(false);
    }
  };

  const handleStopClick = (directionId, stopId, stopName) => {
    if (!routeDetail || marking) return;
    const normalizedDirectionId = normalizeDirectionId(directionId);
    if (!pickState) {
      setPickState({
        directionId: normalizedDirectionId,
        fromStopId: stopId,
        fromName: stopName,
        boardedAt: Date.now(),
      });
      return;
    }

    if (pickState.directionId !== normalizedDirectionId) {
      const lockedDirectionName =
        directionChoices.find(
          (dir) => dir.directionId === pickState.directionId,
        )?.label || `Direction ${pickState.directionId}`;
      showToast(
        `Direction mismatch. Continue on ${lockedDirectionName} or cancel.`,
        "info",
      );
      return;
    }

    if (pickState.fromStopId === stopId) {
      showToast("Pick a different stop to complete this segment.", "info");
      return;
    }

    submitMark(normalizedDirectionId, pickState.fromStopId, stopId);
  };

  // Click a polyline directly to mark just that one hop.
  //
  // We keep the latest values in a ref and read from it inside a stable
  // useCallback. This lets the memoized child <Segment> components keep a
  // stable `onSegmentClick` reference (so React.memo actually skips them
  // on unrelated re-renders) without lying to the exhaustive-deps lint.
  const segmentClickStateRef = useRef({
    marking,
    effectiveCompleted,
    submitMark,
    showToast,
  });
  segmentClickStateRef.current = {
    marking,
    effectiveCompleted,
    submitMark,
    showToast,
  };
  const handleSegmentClick = useCallback((seg) => {
    const s = segmentClickStateRef.current;
    if (s.marking) return;
    if (s.effectiveCompleted.has(seg.key)) {
      s.showToast("Already marked", "info");
      return;
    }
    s.submitMark(seg.directionId, seg.fromStopId, seg.toStopId);
  }, []);

  // Undo the boarding pick (Escape key or button).
  const undoBoarding = useCallback(() => {
    if (!pickState || marking) return;
    setPickState(null);
    showToast("Boarding undone", "info");
  }, [pickState, marking, showToast]);

  useEffect(() => {
    if (!pickState) return;
    const onKey = (e) => {
      if (e.key === "Escape") undoBoarding();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickState, undoBoarding]);

  // Filtered stop list for the on-map search box.
  const stopSearchResults = useMemo(() => {
    const q = stopSearch.trim().toLowerCase();
    if (!q || !visibleStops.length) return [];
    const out = [];
    for (const s of visibleStops) {
      if (s.name && s.name.toLowerCase().includes(q)) {
        out.push(s);
        if (out.length >= 20) break;
      }
    }
    return out;
  }, [stopSearch, visibleStops]);

  const focusStop = (stop) => {
    const map = mapRef.current;
    if (map) {
      map.flyTo([stop.lat, stop.lon], Math.max(map.getZoom(), 16), {
        duration: 0.6,
      });
    }
    // Open the marker tooltip after the pan settles so the user sees the name.
    setTimeout(() => {
      const m = stopMarkerRefs.current[`${stop.directionId}-${stop.id}`];
      if (m && m.openTooltip) m.openTooltip();
    }, 650);
  };

  const handleSearchPick = (stop) => {
    focusStop(stop);
    setStopSearch("");
    // Mirror a tap on the stop: board if no pick, alight if one is in flight.
    handleStopClick(stop.directionId, stop.id, stop.name);
  };

  const routeColor = selectedRoute?.color
    ? `#${selectedRoute.color}`
    : "#60a5fa";
  const hasLockedDirection = Boolean(pickState);

  return (
    <div className="map-wrapper">
      <MapContainer
        ref={mapRef}
        center={SEATTLE_CENTER}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />

        {selectedRoute &&
          allSelectedPositions.length > 0 &&
          !highlightPositions && <FitBounds positions={allSelectedPositions} />}
        {highlightPositions && <FitHighlight positions={highlightPositions} />}
        {!selectedRoute && allProgressPositions.length > 0 && (
          <FitBounds positions={allProgressPositions} />
        )}

        {/* All in-progress routes overlay (no single route selected) */}
        <AllRouteSegmentsLayer
          segments={visibleAllRouteSegments}
          effectiveCompleted={effectiveCompleted}
          allRouteStatsById={allRouteStatsById}
        />

        {/* Two passes: faint background line, bold colored overlay.
             Lets completed hops glow on top of the route base. */}
        {/* Backdrop: full decoded shape variants for the active
             direction. Renders as a thin low-opacity line so the route
             geometry is always continuous, even where per-stop slicing
             can't bridge a trip-pattern variant boundary (e.g. King
             County Route 3 Summit deviation). The colored hop overlay
             below sits on top for traveled/untraveled coloring. */}
        {directionShapes.map((shape) => (
          <Polyline
            key={shape.key}
            positions={shape.positions}
            color={routeColor}
            weight={3}
            opacity={0.35}
            interactive={false}
          />
        ))}
        <RouteSegmentsLayer
          segments={directionSegments}
          effectiveCompleted={effectiveCompleted}
          highlightedSegment={highlightedSegment}
          hoverSeg={hoverSeg}
          setHoverSeg={setHoverSeg}
          recentlyDone={recentlyDone}
          routeColor={routeColor}
          onSegmentClick={handleSegmentClick}
        />

        <StopMarkersLayer
          visibleStops={visibleStops}
          pickState={pickState}
          boardingOrderIndex={boardingOrderIndex}
          routeColor={routeColor}
          boardingIcon={boardingIcon}
          activeDirectionMeta={activeDirectionMeta}
          stopMarkerRefs={stopMarkerRefs}
          onStopClick={handleStopClick}
          showToast={showToast}
        />
      </MapContainer>

      {/* Stacked overlay: direction tabs sit directly above the legend so they never overlap */}
      {(directionChoices.length > 1 || selectedRoute) && (
        <div className="map-overlay-stack">
          {selectedRoute && visibleStops.length > 0 && (
            <StopSearch
              pickState={pickState}
              stopSearch={stopSearch}
              setStopSearch={setStopSearch}
              stopSearchResults={stopSearchResults}
              boardingOrderIndex={boardingOrderIndex}
              onPick={handleSearchPick}
            />
          )}
          {directionChoices.length > 1 && (
            <DirectionTabs
              directionChoices={directionChoices}
              resolvedDirectionId={resolvedDirectionId}
              hasLockedDirection={hasLockedDirection}
              onSelect={(directionId) => {
                setActiveDirection(directionId);
                setPickState(null);
                onClearHighlight?.();
              }}
            />
          )}

          {/* Map legend + per-route progress */}
          {selectedRoute && (
            <MapLegend
              selectedRoute={selectedRoute}
              routeColor={routeColor}
              legendCollapsed={legendCollapsed}
              setLegendCollapsed={setLegendCollapsed}
              completionStats={completionStats}
              activeDirectionMeta={activeDirectionMeta}
              pickState={pickState}
              justCompleted={justCompleted}
              tripStats={tripStats}
            />
          )}
        </div>
      )}

      {!selectedRoute && !allProgressDetails?.length && (
        <div className="map-hero-hint">
          <h2>Pick a route to start</h2>
          <p>
            Use the sidebar to choose a route, then tap its stops or click
            directly on a polyline to log a ride.
          </p>
        </div>
      )}

      {!selectedRoute && allProgressDetails?.length > 0 && (
        <AllRoutesBanner
          allProgressDetails={allProgressDetails}
          allRouteStats={allRouteStats}
          hiddenRouteIds={hiddenAllRouteIds}
          onToggleRoute={toggleHiddenAllRoute}
          onShowAllRoutes={showAllAllRoutes}
          riddenOnly={allRoutesRiddenOnly}
          onToggleRiddenOnly={() => setAllRoutesRiddenOnly((v) => !v)}
          onClose={onClearAllProgress}
        />
      )}

      {/* Pick overlay */}
      <PickOverlay
        pickState={pickState}
        marking={marking}
        liveTripMs={liveTripMs}
        activeDirectionMeta={activeDirectionMeta}
        onUndo={undoBoarding}
      />

      {toast && (
        <div className={`map-toast map-toast-${toast.kind}`}>{toast.msg}</div>
      )}

      <button
        type="button"
        className="map-help-button"
        onClick={() => {
          setHelpAutoOpened(false);
          setHelpOpen(true);
        }}
        aria-label="How to use the map"
        title="How to log a ride"
      >
        ?
      </button>

      <HelpModal
        open={helpOpen}
        showDontShowAgain={helpAutoOpened}
        onClose={() => setHelpOpen(false)}
        onDontShowAgain={() => {
          try {
            localStorage.setItem(HELP_SEEN_KEY, "1");
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  );
}

export default TransitMap;
