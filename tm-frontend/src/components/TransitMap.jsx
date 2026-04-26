import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MapContainer, TileLayer, Polyline } from "react-leaflet";
import L from "leaflet";
import { markSegments } from "../services/api";
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
  formatDuration,
  getTripStats,
  normalizeDirectionId,
  recordTripTime,
} from "./map/mapUtils";
import useToast from "./map/hooks/useToast";
import useLiveTripTimer from "./map/hooks/useLiveTripTimer";
import useFirstVisitHelp from "./map/hooks/useFirstVisitHelp";
import useOptimisticCompletion from "./map/hooks/useOptimisticCompletion";
import useRouteDetail from "./map/hooks/useRouteDetail";
import useDirectionGeometry from "./map/hooks/useDirectionGeometry";
import useAllRoutesView from "./map/hooks/useAllRoutesView";

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
  const [marking, setMarking] = useState(false);
  const [pickState, setPickState] = useState(null);
  const [hoverSeg, setHoverSeg] = useState(null);
  const [stopSearch, setStopSearch] = useState("");
  const [legendCollapsed, setLegendCollapsed] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [tripStatsTick, setTripStatsTick] = useState(0); // bumps to refresh avg
  const completedTimerRef = useRef(null);
  const mapRef = useRef(null);
  const stopMarkerRefs = useRef({});
  const isMobile =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 800px)").matches;

  const { toast, showToast } = useToast();
  const liveTripMs = useLiveTripTimer(pickState?.boardedAt || null);
  const { helpOpen, helpAutoOpened, openHelp, closeHelp, markSeen } =
    useFirstVisitHelp();

  const {
    routeDetail,
    setActiveDirection,
    directionChoices,
    resolvedDirectionId,
    activeDirectionMeta,
    refreshAfterValidationError,
  } = useRouteDetail(selectedRoute, {
    onLoadError: () => showToast("Could not load route", "error"),
  });

  const {
    effectiveCompleted,
    recentlyDone,
    addOptimistic,
    rollback: rollbackOptimistic,
    reset: resetOptimistic,
  } = useOptimisticCompletion(completedSegments);

  const {
    directionSegments,
    directionShapes,
    allSelectedPositions,
    visibleStops,
    highlightPositions,
  } = useDirectionGeometry(
    routeDetail,
    resolvedDirectionId,
    highlightedSegment,
  );

  const {
    visibleAllRouteSegments,
    allProgressPositions,
    allRouteStats,
    allRouteStatsById,
    hiddenRouteIds: hiddenAllRouteIds,
    riddenOnly: allRoutesRiddenOnly,
    toggleHiddenRoute: toggleHiddenAllRoute,
    showAllRoutes: showAllAllRoutes,
    toggleRiddenOnly: toggleAllRoutesRiddenOnly,
  } = useAllRoutesView(allProgressDetails, selectedRoute, effectiveCompleted);

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

  // Cleanup any one-off timers we still own at unmount.
  useEffect(
    () => () => {
      if (completedTimerRef.current) clearTimeout(completedTimerRef.current);
    },
    [],
  );

  // Clear pickState when the user switches routes (the boarding stop is
  // route-specific, so it would be meaningless on the new route).
  useEffect(() => {
    setPickState(null);
  }, [selectedRoute]);

  // Sync direction when a highlighted segment is requested from outside.
  useEffect(() => {
    if (
      highlightedSegment &&
      routeDetail &&
      highlightedSegment.routeId === routeDetail.id
    ) {
      setActiveDirection(normalizeDirectionId(highlightedSegment.directionId));
    }
  }, [highlightedSegment, routeDetail, setActiveDirection]);

  // On phones, auto-collapse the legend when the user is mid-pick so the
  // bottom pick prompt doesn't fight with the legend's step list for space.
  useEffect(() => {
    if (!isMobile) return;
    if (pickState) setLegendCollapsed(true);
  }, [pickState, isMobile]);

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

  // Reset optimistic completion state whenever the selected route changes.
  useEffect(() => {
    resetOptimistic();
  }, [selectedRoute, resetOptimistic]);

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
      refreshAfterValidationError(normalizedDirectionId);
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
      refreshAfterValidationError(normalizedDirectionId);
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

    addOptimistic(optimisticKeys);

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
        refreshAfterValidationError(normalizedDirectionId);
      }

      // Roll back the optimistic paint if the server rejected the mark.
      rollbackOptimistic(optimisticKeys);
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
          isMobile={isMobile}
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
          onToggleRiddenOnly={toggleAllRoutesRiddenOnly}
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
        onClick={openHelp}
        aria-label="How to use the map"
        title="How to log a ride"
      >
        ?
      </button>

      <HelpModal
        open={helpOpen}
        showDontShowAgain={helpAutoOpened}
        onClose={closeHelp}
        onDontShowAgain={markSeen}
      />
    </div>
  );
}

export default TransitMap;
