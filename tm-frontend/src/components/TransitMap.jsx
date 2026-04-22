import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  CircleMarker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import { fetchRouteDetail, markSegments } from "../services/api";
import HelpModal from "./HelpModal";

const SEATTLE_CENTER = [47.6062, -122.3321];

const HELP_SEEN_KEY = "te-help-seen-v1";
const TRIP_TIMES_KEY = "te-trip-times-v1";
const TRIP_TIMES_MAX = 25; // keep at most N samples per route+direction

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

function recordTripTime(routeId, directionId, ms) {
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

function getTripStats(routeId, directionId) {
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

function formatDuration(ms) {
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

const ROUTE_TYPE_LABELS = {
  0: "Link",
  1: "Subway",
  2: "Rail",
  3: "Bus",
  4: "Ferry",
  5: "Cable",
  6: "Gondola",
  7: "Funicular",
};
const ROUTE_TYPE_ICONS = {
  0: "🚊",
  1: "🚇",
  2: "🚆",
  3: "🚌",
  4: "⛴️",
  5: "🚠",
  6: "🚠",
  7: "🚞",
};

function decode(encoded) {
  if (!encoded) return [];
  return polyline.decode(encoded);
}

/* Snap each stop to the nearest index on the polyline, then slice. */
function slicePolylineByStops(line, stopPositions) {
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

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(positions, { padding: [40, 40] });
  }, [positions, map]);
  return null;
}

function FitHighlight({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 0)
      map.fitBounds(positions, { padding: [80, 80], maxZoom: 16 });
  }, [positions, map]);
  return null;
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
  const [tripStatsTick, setTripStatsTick] = useState(0); // bumps to refresh avg
  const [liveTripMs, setLiveTripMs] = useState(0);
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

  const showToast = (msg, kind = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  };

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
      if (!seen) setHelpOpen(true);
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
          setActiveDirection(data.directions[0].direction_id);
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
      setActiveDirection(highlightedSegment.directionId);
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
        directionId: dir.direction_id,
        label: dir.direction_name || `Direction ${dir.direction_id}`,
        firstStopName: firstStop?.name || null,
        lastStopName: lastStop?.name || null,
      };
    });
  }, [routeDetail]);

  const activeDirectionMeta = useMemo(
    () =>
      directionChoices.find((dir) => dir.directionId === activeDirection) ||
      directionChoices[0] ||
      null,
    [directionChoices, activeDirection],
  );

  const directionSegments = useMemo(() => {
    if (!routeDetail) return [];
    const result = [];
    for (const dir of routeDetail.directions || []) {
      if (activeDirection !== null && dir.direction_id !== activeDirection)
        continue;
      const line = decode(dir.encoded_polyline);
      const stopIds = dir.stop_ids || [];
      const stopsMap = routeDetail.stops || {};
      const stopPositions = stopIds
        .map((id) => stopsMap[id])
        .filter(Boolean)
        .map((s) => [s.lat, s.lon]);
      const polySegments = slicePolylineByStops(line, stopPositions);
      for (let i = 0; i < polySegments.length; i++) {
        if (i + 1 < stopIds.length) {
          result.push({
            directionId: dir.direction_id,
            fromStopId: stopIds[i],
            toStopId: stopIds[i + 1],
            fromName: stopsMap[stopIds[i]]?.name,
            toName: stopsMap[stopIds[i + 1]]?.name,
            positions: polySegments[i],
            key: `${routeDetail.id}|${dir.direction_id}|${stopIds[i]}|${stopIds[i + 1]}`,
          });
        }
      }
    }
    return result;
  }, [routeDetail, activeDirection]);

  const allSelectedPositions = useMemo(
    () => directionSegments.flatMap((s) => s.positions),
    [directionSegments],
  );

  const visibleStops = useMemo(() => {
    if (!routeDetail) return [];
    const stopsMap = routeDetail.stops || {};
    const result = [];
    const seen = new Set();
    for (const dir of routeDetail.directions || []) {
      if (activeDirection !== null && dir.direction_id !== activeDirection)
        continue;
      const ids = dir.stop_ids || [];
      ids.forEach((stopId, idx) => {
        if (seen.has(stopId)) return;
        seen.add(stopId);
        const stop = stopsMap[stopId];
        if (stop) {
          result.push({
            ...stop,
            directionId: dir.direction_id,
            isTerminus: idx === 0 || idx === ids.length - 1,
            orderIndex: idx,
          });
        }
      });
    }
    return result;
  }, [routeDetail, activeDirection]);

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
    // when the user re-requests the same segment (e.g. "Recenter").
    return seg ? [...seg.positions] : null;
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
  const allRouteSegments = useMemo(() => {
    if (!allProgressDetails?.length || selectedRoute) return [];
    const result = [];
    for (const detail of allProgressDetails) {
      const color = detail.color ? `#${detail.color}` : "#60a5fa";
      for (const dir of detail.directions || []) {
        const line = decode(dir.encoded_polyline);
        const stopIds = dir.stop_ids || [];
        const stopsMap = detail.stops || {};
        // Filter stopIds and stopPositions in parallel so segment indices
        // stay aligned with the surviving stop IDs.
        const filteredStopIds = stopIds.filter((id) => Boolean(stopsMap[id]));
        const stopPositions = filteredStopIds.map((id) => {
          const stop = stopsMap[id];
          return [stop.lat, stop.lon];
        });
        const polySegs = slicePolylineByStops(line, stopPositions);
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
    }
    return result;
  }, [allProgressDetails, selectedRoute]);

  // All positions across every in-progress route for fitting the map view.
  const allProgressPositions = useMemo(
    () => allRouteSegments.flatMap((s) => s.positions),
    [allRouteSegments],
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
    if (!routeDetail || activeDirection == null) return null;
    return getTripStats(routeDetail.id, activeDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeDetail, activeDirection, tripStatsTick]);

  const submitMark = async (directionId, fromStopId, toStopId) => {
    if (!routeDetail) return;

    // Capture trip-time + boarding context BEFORE we clear pickState so we
    // can record an accurate duration and pre-paint the segments green.
    const boardedAt = pickState?.boardedAt || null;
    const tripMs = boardedAt ? Date.now() - boardedAt : null;

    // Build the list of optimistic keys for the entire run from -> to. The
    // backend creates one segment per consecutive stop pair, so we mirror
    // that here so the line turns green immediately on click.
    const optimisticKeys = [];
    const dir = (routeDetail.directions || []).find(
      (d) => d.direction_id === directionId,
    );
    if (dir) {
      const ids = dir.stop_ids || [];
      const a = ids.indexOf(fromStopId);
      const b = ids.indexOf(toStopId);
      if (a !== -1 && b !== -1) {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        for (let i = lo; i < hi; i++) {
          optimisticKeys.push(
            `${routeDetail.id}|${directionId}|${ids[i]}|${ids[i + 1]}`,
          );
        }
      }
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
        directionId,
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
          recordTripTime(routeDetail.id, directionId, tripMs);
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
    if (!pickState) {
      setPickState({
        directionId,
        fromStopId: stopId,
        fromName: stopName,
        boardedAt: Date.now(),
      });
      return;
    }

    if (pickState.directionId !== directionId) {
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

    submitMark(directionId, pickState.fromStopId, stopId);
  };

  // Click a polyline directly to mark just that one hop.
  const handleSegmentClick = (seg) => {
    if (marking) return;
    if (effectiveCompleted.has(seg.key)) {
      showToast("Already marked", "info");
      return;
    }
    submitMark(seg.directionId, seg.fromStopId, seg.toStopId);
  };

  // Undo the boarding pick (Escape key or button).
  const undoBoarding = () => {
    if (!pickState || marking) return;
    setPickState(null);
    showToast("Boarding undone", "info");
  };

  useEffect(() => {
    if (!pickState) return;
    const onKey = (e) => {
      if (e.key === "Escape") undoBoarding();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickState, marking]);

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
        {!selectedRoute &&
          allProgressPositions.length > 0 && (
            <FitBounds positions={allProgressPositions} />
          )}

        {/* All in-progress routes overlay (no single route selected) */}
        {allRouteSegments.map((seg) => {
          const done = effectiveCompleted.has(seg.key);
          const routeInfo = allRouteStats.find((r) => r.id === seg.routeId);
          return (
            <Polyline
              key={seg.key}
              positions={seg.positions}
              color={done ? "#22c55e" : seg.color}
              weight={done ? 5 : 3}
              opacity={done ? 0.85 : 0.45}
            >
              {routeInfo && (
                <Tooltip sticky pane="tooltipPane">
                  <span style={{ fontWeight: 600 }}>{routeInfo.name}</span>
                  {" · "}
                  {done ? (
                    <span style={{ color: "#22c55e" }}>Completed</span>
                  ) : (
                    <span>{routeInfo.pct}% done</span>
                  )}
                </Tooltip>
              )}
            </Polyline>
          );
        })}

        {/* Two passes: faint background line, bold colored overlay.
             Lets completed hops glow on top of the route base. */}
        {directionSegments.map((seg) => {
          const done = effectiveCompleted.has(seg.key);
          const isHighlighted =
            highlightedSegment &&
            seg.key ===
              `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
          const isHovered = hoverSeg === seg.key;
          const isFresh = recentlyDone.has(seg.key);
          return (
            <React.Fragment key={seg.key}>
              <Polyline
                positions={seg.positions}
                color={
                  isHighlighted ? "#facc15" : done ? "#22c55e" : routeColor
                }
                weight={isHighlighted ? 8 : done ? 6 : isHovered ? 6 : 4}
                opacity={isHighlighted ? 1 : done ? 1 : isHovered ? 0.95 : 0.55}
                eventHandlers={{
                  click: () => handleSegmentClick(seg),
                  mouseover: () => setHoverSeg(seg.key),
                  mouseout: () =>
                    setHoverSeg((h) => (h === seg.key ? null : h)),
                }}
              >
                <Tooltip sticky direction="top" opacity={0.95}>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>
                    {seg.fromName} → {seg.toName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: done ? "#22c55e" : "#60a5fa",
                    }}
                  >
                    {done ? "✓ Already marked" : "Click to mark this hop"}
                  </div>
                </Tooltip>
              </Polyline>
              {isFresh && (
                <Polyline
                  positions={seg.positions}
                  color="#4ade80"
                  weight={14}
                  opacity={0.55}
                  className="segment-pulse"
                  interactive={false}
                />
              )}
            </React.Fragment>
          );
        })}

        {visibleStops.map((stop) => {
          const isPicking = pickState?.directionId === stop.directionId;
          const isFrom = isPicking && pickState?.fromStopId === stop.id;
          // A stop is a valid ending candidate only if it sits *after* the
          // boarding stop in the direction's stop order.
          const isValidCandidate =
            isPicking &&
            !isFrom &&
            boardingOrderIndex !== null &&
            stop.orderIndex > boardingOrderIndex;
          // Same-direction stops that come *before* boarding are invalid —
          // dim them and show an explanatory tooltip.
          const isUpstreamInvalid =
            isPicking &&
            !isFrom &&
            boardingOrderIndex !== null &&
            stop.orderIndex <= boardingOrderIndex;

          if (isFrom) {
            return (
              <Marker
                key={`${stop.directionId}-${stop.id}`}
                position={[stop.lat, stop.lon]}
                icon={boardingIcon}
                ref={(el) => {
                  if (el)
                    stopMarkerRefs.current[`${stop.directionId}-${stop.id}`] =
                      el;
                }}
                eventHandlers={{
                  click: () =>
                    handleStopClick(stop.directionId, stop.id, stop.name),
                }}
              >
                <Tooltip direction="top" offset={[0, -14]} opacity={0.95}>
                  <span style={{ fontWeight: 600 }}>{stop.name}</span>
                  <br />
                  <span style={{ fontSize: 11, color: "#22c55e" }}>
                    Boarding stop — tap a stop ahead (toward{" "}
                    {activeDirectionMeta?.lastStopName || "destination"})
                  </span>
                </Tooltip>
              </Marker>
            );
          }

          return (
            <CircleMarker
              key={`${stop.directionId}-${stop.id}`}
              center={[stop.lat, stop.lon]}
              radius={
                isUpstreamInvalid
                  ? 4
                  : stop.isTerminus
                    ? 7
                    : isValidCandidate
                      ? 7
                      : 5
              }
              fillColor={
                isUpstreamInvalid
                  ? "#475569"
                  : isValidCandidate
                    ? "#60a5fa"
                    : stop.isTerminus
                      ? routeColor
                      : "#fff"
              }
              color={
                isUpstreamInvalid
                  ? "#475569"
                  : isValidCandidate
                    ? "#60a5fa"
                    : routeColor
              }
              weight={isValidCandidate ? 3 : 2}
              opacity={isUpstreamInvalid ? 0.5 : 1}
              fillOpacity={isUpstreamInvalid ? 0.4 : 1}
              ref={(el) => {
                if (el)
                  stopMarkerRefs.current[`${stop.directionId}-${stop.id}`] = el;
              }}
              eventHandlers={{
                click: () => {
                  if (isUpstreamInvalid) {
                    showToast(
                      "That stop is behind your boarding point — pick one ahead or change directions.",
                      "info",
                    );
                    return;
                  }
                  handleStopClick(stop.directionId, stop.id, stop.name);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                <span style={{ fontWeight: 500 }}>{stop.name}</span>
                {stop.isTerminus && (
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {" "}
                    · Terminus
                  </span>
                )}
                {!pickState && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, opacity: 0.7 }}>
                      Tap to board here
                    </span>
                  </>
                )}
                {isValidCandidate && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: "#60a5fa" }}>
                      Tap — got off here
                    </span>
                  </>
                )}
                {isUpstreamInvalid && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      Behind boarding — can't alight here
                    </span>
                  </>
                )}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Stacked overlay: direction tabs sit directly above the legend so they never overlap */}
      {(directionChoices.length > 1 || selectedRoute) && (
        <div className="map-overlay-stack">
          {selectedRoute && visibleStops.length > 0 && (
            <div className={`stop-search ${stopSearch ? "is-open" : ""}`}>
              <div className="stop-search-row">
                <span
                  className="stop-search-icon"
                  aria-hidden="true"
                  title="Search stops on this route"
                >
                  🔍
                </span>
                <input
                  type="text"
                  className="stop-search-input"
                  placeholder={
                    pickState
                      ? "Find your ending stop…"
                      : "Find a stop on this route…"
                  }
                  value={stopSearch}
                  onChange={(e) => setStopSearch(e.target.value)}
                  aria-label="Search stops on this route"
                />
                {stopSearch && (
                  <button
                    type="button"
                    className="stop-search-clear"
                    onClick={() => setStopSearch("")}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
              {stopSearch && (
                <div className="stop-search-results">
                  {stopSearchResults.length === 0 ? (
                    <div className="stop-search-empty">No matching stops</div>
                  ) : (
                    stopSearchResults.map((s) => {
                      const isBoardingChoice =
                        pickState && pickState.fromStopId === s.id;
                      return (
                        <button
                          type="button"
                          key={`${s.directionId}-${s.id}`}
                          className="stop-search-result"
                          onClick={() => handleSearchPick(s)}
                          disabled={isBoardingChoice}
                          title={
                            isBoardingChoice
                              ? "This is your boarding stop"
                              : pickState
                                ? "Mark as ending stop"
                                : "Board here"
                          }
                        >
                          <span className="stop-search-result-name">
                            {s.name}
                          </span>
                          {s.isTerminus && (
                            <span className="stop-search-result-tag">
                              Terminus
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
          {directionChoices.length > 1 && (
            <div className="direction-tabs">
              {directionChoices.map((dir) => (
                <button
                  key={dir.directionId}
                  className={`direction-tab ${activeDirection === dir.directionId ? "active" : ""}`}
                  onClick={() => {
                    setActiveDirection(dir.directionId);
                    setPickState(null);
                    onClearHighlight?.();
                  }}
                >
                  <span className="direction-tab-label">{dir.label}</span>
                  <span
                    className="direction-tab-sub"
                    title={dir.lastStopName || ""}
                  >
                    {dir.lastStopName
                      ? `Toward ${dir.lastStopName}`
                      : "Tap to follow this direction"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Map legend + per-route progress */}
          {selectedRoute && (
            <div
              className={`map-legend ${legendCollapsed ? "is-collapsed" : ""}`}
            >
              <div className="map-legend-title">
                <span
                  className="map-legend-swatch"
                  style={{ background: routeColor }}
                />
                <span className="map-legend-mode">
                  {ROUTE_TYPE_ICONS[selectedRoute.route_type] || "🚌"}{" "}
                  {ROUTE_TYPE_LABELS[selectedRoute.route_type] || "Transit"}
                </span>
                <span className="map-legend-name">
                  {selectedRoute.short_name || selectedRoute.long_name}
                  {selectedRoute.short_name && selectedRoute.long_name ? (
                    <span className="map-legend-sub">
                      {" "}
                      · {selectedRoute.long_name}
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="map-legend-collapse"
                  onClick={() => setLegendCollapsed((v) => !v)}
                  aria-expanded={!legendCollapsed}
                  aria-label={legendCollapsed ? "Show legend" : "Hide legend"}
                  title={legendCollapsed ? "Show details" : "Hide details"}
                >
                  {legendCollapsed ? "▴" : "▾"}
                </button>
              </div>
              {!legendCollapsed && completionStats && (
                <div className="map-legend-progress">
                  <div className="map-legend-bar">
                    <div
                      className="map-legend-fill"
                      style={{
                        width: `${(completionStats.done / completionStats.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span>
                    {completionStats.done}/{completionStats.total} done
                  </span>
                </div>
              )}
              {!legendCollapsed && activeDirectionMeta && (
                <div className="map-legend-direction">
                  <span className="map-legend-direction-label">
                    Logging direction
                  </span>
                  <strong>{activeDirectionMeta.label}</strong>
                  {activeDirectionMeta.firstStopName &&
                    activeDirectionMeta.lastStopName && (
                      <span className="map-legend-direction-flow">
                        {activeDirectionMeta.firstStopName} →{" "}
                        {activeDirectionMeta.lastStopName}
                      </span>
                    )}
                </div>
              )}
              {!legendCollapsed && (
                <div className="map-legend-steps">
                  <div
                    className={`map-legend-step ${activeDirectionMeta || pickState || justCompleted ? "is-complete" : "is-active"}`}
                  >
                    <span className="map-legend-step-num">
                      {activeDirectionMeta || pickState || justCompleted
                        ? "✓"
                        : "1"}
                    </span>
                    <span>
                      Choose the correct direction
                      {activeDirectionMeta?.lastStopName
                        ? ` (toward ${activeDirectionMeta.lastStopName})`
                        : ""}
                    </span>
                  </div>
                  <div
                    className={`map-legend-step ${pickState || justCompleted ? "is-complete" : activeDirectionMeta ? "is-active" : ""}`}
                  >
                    <span className="map-legend-step-num">
                      {pickState || justCompleted ? "✓" : "2"}
                    </span>
                    <span>
                      {pickState
                        ? `Boarded: ${pickState.fromName}`
                        : "Tap your boarding stop"}
                    </span>
                  </div>
                  <div
                    className={`map-legend-step ${justCompleted ? "is-complete" : pickState ? "is-active" : ""}`}
                  >
                    <span className="map-legend-step-num">
                      {justCompleted ? "✓" : "3"}
                    </span>
                    <span>
                      {justCompleted
                        ? "Trip logged — pick another or change direction"
                        : "Tap your ending stop in the same direction"}
                    </span>
                  </div>
                </div>
              )}
              {!legendCollapsed && (
                <div className="map-legend-hints">
                  <span>
                    <i className="dot done" /> Completed
                  </span>
                  <span>
                    <i
                      className="dot pending"
                      style={{ background: routeColor }}
                    />{" "}
                    Pending
                  </span>
                </div>
              )}
              {!legendCollapsed && tripStats && (
                <div
                  className="map-legend-trip-stats"
                  title="Average and most-recent ride time, measured between your boarding and ending taps. Stored locally on this device."
                >
                  <span className="map-legend-trip-icon" aria-hidden>
                    ⏱
                  </span>
                  <span>
                    <strong>{formatDuration(tripStats.avgMs)}</strong> avg
                    {tripStats.count > 1 ? ` (${tripStats.count} trips)` : ""}
                    {tripStats.lastMs ? (
                      <>
                        {" · "}
                        <span className="map-legend-trip-last">
                          last {formatDuration(tripStats.lastMs)}
                        </span>
                      </>
                    ) : null}
                  </span>
                </div>
              )}
            </div>
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
        <div className="all-routes-banner">
          <div className="all-routes-banner-header">
            <span className="all-routes-banner-text">
              🗺 Viewing all {allProgressDetails.length} in-progress route
              {allProgressDetails.length !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="all-routes-banner-clear"
              onClick={() => onClearAllProgress?.()}
              aria-label="Close all-routes view"
            >
              ✕ Close
            </button>
          </div>
          <div className="all-routes-legend-list">
            <span className="all-routes-legend all-routes-legend-global">
              <i
                aria-hidden="true"
                className="all-routes-legend-dot"
                style={{ background: "#22c55e" }}
              />{" "}
              Completed
            </span>
            {allRouteStats.map((r) => (
              <span key={r.id} className="all-routes-route-chip">
                <i
                  aria-hidden="true"
                  className="all-routes-legend-dot"
                  style={{ background: r.color }}
                />
                {r.name}
                <span className="all-routes-route-chip-pct">{r.pct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Pick overlay */}
      {pickState && !marking && (
        <div className="pick-overlay">
          <div className="pick-info">
            <span className="pick-dot boarding" />
            <span className="pick-label">
              Boarded at <strong>{pickState.fromName}</strong>
            </span>
          </div>
          <span className="pick-arrow">→</span>
          <span className="pick-prompt">Now tap your ending stop</span>
          {pickState.boardedAt && (
            <span
              className="pick-timer"
              title="Time since you tapped your boarding stop"
            >
              ⏱ {formatDuration(liveTripMs) || "0s"}
            </span>
          )}
          {activeDirectionMeta && (
            <span className="pick-direction-lock">
              Direction locked: {activeDirectionMeta.label}
              {activeDirectionMeta.lastStopName
                ? ` toward ${activeDirectionMeta.lastStopName}`
                : ""}
            </span>
          )}
          <button
            className="pick-undo"
            onClick={undoBoarding}
            title="Undo boarding (Esc)"
          >
            ↶ Undo boarding
          </button>
        </div>
      )}
      {marking && (
        <div className="pick-overlay">
          <span className="spinner" /> Saving…
        </div>
      )}

      {/* Highlighted-from-progress banner */}
      {highlightedSegment && !pickState && (
        <div className="highlight-banner">
          <span>📍 Viewing segment from progress</span>
          <button
            className="pick-cancel"
            style={{ marginLeft: 10 }}
            onClick={() => onClearHighlight?.()}
          >
            ✕
          </button>
        </div>
      )}

      {toast && (
        <div className={`map-toast map-toast-${toast.kind}`}>{toast.msg}</div>
      )}

      <button
        type="button"
        className="map-help-button"
        onClick={() => setHelpOpen(true)}
        aria-label="How to use the map"
        title="How to log a ride"
      >
        ?
      </button>

      <HelpModal
        open={helpOpen}
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
