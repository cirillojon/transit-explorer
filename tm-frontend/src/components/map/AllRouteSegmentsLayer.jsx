import React from "react";
import { Polyline, Tooltip } from "react-leaflet";

function AllRouteSegmentsLayer({
  segments,
  effectiveCompleted,
  allRouteStatsById,
}) {
  return segments.map((seg) => {
    // Skip hops with no drawable polyline geometry; they're still counted
    // in per-route progress totals upstream.
    if (!seg.positions) return null;
    const done = effectiveCompleted.has(seg.key);
    const routeInfo = allRouteStatsById.get(seg.routeId);
    return (
      <Polyline
        key={seg.key}
        positions={seg.positions}
        // See RouteSegmentsLayer: react-leaflet v5 only reactively updates
        // styling via `pathOptions`; direct color/weight/opacity props are
        // applied at mount only.
        pathOptions={{
          color: done ? "#22c55e" : seg.color,
          weight: done ? 5 : 3,
          opacity: done ? 0.85 : 0.45,
        }}
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
  });
}

export default AllRouteSegmentsLayer;
