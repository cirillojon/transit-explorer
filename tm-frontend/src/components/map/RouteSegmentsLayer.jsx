import React from "react";
import { Polyline, Tooltip } from "react-leaflet";

function RouteSegmentsLayer({
  segments,
  effectiveCompleted,
  highlightedSegment,
  hoverSeg,
  setHoverSeg,
  recentlyDone,
  routeColor,
  onSegmentClick,
}) {
  return segments.map((seg) => {
    // Hops with no drawable polyline geometry (off-route stops, missing
    // agency data) are still tracked in the segment list so completion
    // stats stay accurate, but there's nothing to paint here.
    if (!seg.positions) return null;
    const done = effectiveCompleted.has(seg.key);
    const isHighlighted =
      highlightedSegment &&
      seg.key ===
        `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
    const isHovered = hoverSeg === seg.key;
    const isFresh = recentlyDone.has(seg.key);
    const color = isHighlighted ? "#facc15" : done ? "#22c55e" : routeColor;
    const weight = isHighlighted ? 8 : done ? 6 : isHovered ? 6 : 4;
    const opacity = isHighlighted ? 1 : done ? 1 : isHovered ? 0.95 : 0.55;
    return (
      <React.Fragment key={seg.key}>
        <Polyline
          positions={seg.positions}
          // react-leaflet v5 only reactively updates style via `pathOptions`;
          // passing color/weight/opacity as direct props applies them at
          // mount only and skips later updates, so a polyline that turns
          // "done" after the initial render would otherwise stay the route
          // color until the layer is remounted.
          pathOptions={{ color, weight, opacity }}
          eventHandlers={{
            click: () => onSegmentClick(seg),
            mouseover: () => setHoverSeg(seg.key),
            mouseout: () => setHoverSeg((h) => (h === seg.key ? null : h)),
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
  });
}

export default RouteSegmentsLayer;
