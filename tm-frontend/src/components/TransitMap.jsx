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

const SEATTLE_CENTER = [47.6062, -122.3321];

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
}) {
  const [routeDetail, setRouteDetail] = useState(null);
  const [marking, setMarking] = useState(false);
  const [pickState, setPickState] = useState(null);
  const [activeDirection, setActiveDirection] = useState(null);
  const [toast, setToast] = useState(null);
  const [hoverSeg, setHoverSeg] = useState(null);
  const [stopSearch, setStopSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const toastTimerRef = useRef(null);
  const mapRef = useRef(null);
  const stopMarkerRefs = useRef({});

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
    },
    [],
  );

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
          });
        }
      });
    }
    return result;
  }, [routeDetail, activeDirection]);

  const highlightPositions = useMemo(() => {
    if (!highlightedSegment) return null;
    const key = `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
    const seg = directionSegments.find((s) => s.key === key);
    // Return a fresh array each time so FitHighlight's effect fires even
    // when the user re-requests the same segment (e.g. "Recenter").
    return seg ? [...seg.positions] : null;
  }, [highlightedSegment, directionSegments]);

  const completionStats = useMemo(() => {
    if (!directionSegments.length) return null;
    const done = directionSegments.filter((s) =>
      completedSegments.has(s.key),
    ).length;
    return { done, total: directionSegments.length };
  }, [directionSegments, completedSegments]);

  const submitMark = async (directionId, fromStopId, toStopId) => {
    if (!routeDetail) return;
    setMarking(true);
    try {
      const result = await markSegments(
        routeDetail.id,
        directionId,
        fromStopId,
        toStopId,
      );
      setPickState(null);
      onSegmentsMarked();
      const created = result.created ?? 0;
      const skipped = result.skipped ?? 0;
      if (created > 0) {
        showToast(
          `✓ Marked ${created} segment${created > 1 ? "s" : ""}` +
            (skipped ? ` · ${skipped} already done` : ""),
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
      showToast(err.message || "Could not save segment", "error");
    } finally {
      setMarking(false);
    }
  };

  const handleStopClick = (directionId, stopId, stopName) => {
    if (!routeDetail || marking) return;
    if (!pickState) {
      setPickState({ directionId, fromStopId: stopId, fromName: stopName });
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
    if (completedSegments.has(seg.key)) {
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
    setSearchOpen(false);
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

        {/* Two passes: faint background line, bold colored overlay.
             Lets completed hops glow on top of the route base. */}
        {directionSegments.map((seg) => {
          const done = completedSegments.has(seg.key);
          const isHighlighted =
            highlightedSegment &&
            seg.key ===
              `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
          const isHovered = hoverSeg === seg.key;
          return (
            <Polyline
              key={seg.key}
              positions={seg.positions}
              color={isHighlighted ? "#facc15" : done ? "#22c55e" : routeColor}
              weight={isHighlighted ? 8 : done ? 6 : isHovered ? 6 : 4}
              opacity={isHighlighted ? 1 : done ? 1 : isHovered ? 0.95 : 0.55}
              eventHandlers={{
                click: () => handleSegmentClick(seg),
                mouseover: () => setHoverSeg(seg.key),
                mouseout: () => setHoverSeg((h) => (h === seg.key ? null : h)),
              }}
            >
              <Tooltip sticky direction="top" opacity={0.95}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>
                  {seg.fromName} → {seg.toName}
                </div>
                <div
                  style={{ fontSize: 11, color: done ? "#22c55e" : "#60a5fa" }}
                >
                  {done ? "✓ Already marked" : "Click to mark this hop"}
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {visibleStops.map((stop) => {
          const isPicking = pickState?.directionId === stop.directionId;
          const isFrom = isPicking && pickState?.fromStopId === stop.id;
          const isCandidate = isPicking && !isFrom;

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
                  <span style={{ fontSize: 11, color: "#facc15" }}>
                    Boarding stop — tap your alighting stop
                  </span>
                </Tooltip>
              </Marker>
            );
          }

          return (
            <CircleMarker
              key={`${stop.directionId}-${stop.id}`}
              center={[stop.lat, stop.lon]}
              radius={stop.isTerminus ? 7 : isCandidate ? 7 : 5}
              fillColor={
                isCandidate ? "#60a5fa" : stop.isTerminus ? routeColor : "#fff"
              }
              color={isCandidate ? "#60a5fa" : routeColor}
              weight={isCandidate ? 3 : 2}
              opacity={1}
              fillOpacity={1}
              ref={(el) => {
                if (el)
                  stopMarkerRefs.current[`${stop.directionId}-${stop.id}`] = el;
              }}
              eventHandlers={{
                click: () =>
                  handleStopClick(stop.directionId, stop.id, stop.name),
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
                {isCandidate && (
                  <>
                    <br />
                    <span style={{ fontSize: 11, color: "#60a5fa" }}>
                      Tap — got off here
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
            <div className={`stop-search ${searchOpen ? "is-open" : ""}`}>
              <div className="stop-search-row">
                <button
                  type="button"
                  className="stop-search-toggle"
                  onClick={() => setSearchOpen((v) => !v)}
                  title="Search stops on this route"
                  aria-label="Search stops"
                >
                  🔍
                </button>
                {searchOpen && (
                  <>
                    <input
                      type="text"
                      className="stop-search-input"
                      placeholder={
                        pickState
                          ? "Find your alighting stop…"
                          : "Find a stop on this route…"
                      }
                      value={stopSearch}
                      onChange={(e) => setStopSearch(e.target.value)}
                      autoFocus
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
                  </>
                )}
              </div>
              {searchOpen && stopSearch && (
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
                                ? "Mark as alighting stop"
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
            <div className="map-legend">
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
              </div>
              {completionStats && (
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
              {activeDirectionMeta && (
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
              <div className="map-legend-steps">
                <div
                  className={`map-legend-step ${activeDirectionMeta ? "is-complete" : "is-active"}`}
                >
                  <span className="map-legend-step-num">1</span>
                  <span>
                    Choose the correct direction
                    {activeDirectionMeta?.lastStopName
                      ? ` (toward ${activeDirectionMeta.lastStopName})`
                      : ""}
                  </span>
                </div>
                <div
                  className={`map-legend-step ${pickState ? "is-complete" : "is-active"}`}
                >
                  <span className="map-legend-step-num">2</span>
                  <span>
                    {pickState
                      ? `Boarded: ${pickState.fromName}`
                      : "Tap your boarding stop"}
                  </span>
                </div>
                <div
                  className={`map-legend-step ${pickState ? "is-active" : ""}`}
                >
                  <span className="map-legend-step-num">3</span>
                  <span>Tap your alighting stop in the same direction</span>
                </div>
              </div>
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
            </div>
          )}
        </div>
      )}

      {!selectedRoute && (
        <div className="map-hero-hint">
          <h2>Pick a route to start</h2>
          <p>
            Use the sidebar to choose a route, then tap its stops or click
            directly on a polyline to log a ride.
          </p>
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
          <span className="pick-prompt">Now tap your alighting stop</span>
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
    </div>
  );
}

export default TransitMap;
