import React, { useMemo } from "react";
import { Polyline, Tooltip } from "react-leaflet";

const MOBILE_TAP_AREA_EXPANSION = 16;

// Memoized single-segment polyline. Pulled out of the parent's render so we
// only rebuild `pathOptions` (and call leaflet's setStyle) for segments whose
// visual state actually changed, instead of every segment on every parent
// render. With ~100 segments per direction this used to cause noticeable
// jank on hover/mark.
//
// IMPORTANT: callbacks are passed as stable references from the parent and
// dispatched here using `seg`/`segKey`, otherwise React.memo would always
// see fresh inline arrows and re-render every segment anyway.
const Segment = React.memo(function Segment({
  seg,
  color,
  weight,
  opacity,
  done,
  isFresh,
  isCoarsePointer,
  onSegmentClick,
  setHoverSeg,
}) {
  const segKey = seg.key;
  const pathOptions = useMemo(
    () => ({ color, weight, opacity }),
    [color, weight, opacity],
  );
  // react-leaflet v5 only reactively updates style via `pathOptions`; keep the
  // hit-target using `pathOptions` too so its width tracks `weight` changes
  // (highlight, hover, done) rather than freezing at the mount-time value.
  const hitTargetPathOptions = useMemo(
    () => ({ weight: weight + MOBILE_TAP_AREA_EXPANSION, opacity: 0 }),
    [weight],
  );
  const eventHandlers = useMemo(
    () => ({
      click: () => onSegmentClick(seg),
      mouseover: () => setHoverSeg(segKey),
      mouseout: () => setHoverSeg((h) => (h === segKey ? null : h)),
    }),
    [seg, segKey, onSegmentClick, setHoverSeg],
  );
  return (
    <>
      <Polyline
        positions={seg.positions}
        // react-leaflet v5 only reactively updates style via `pathOptions`;
        // passing color/weight/opacity as direct props applies them at
        // mount only and skips later updates, so a polyline that turns
        // "done" after the initial render would otherwise stay the route
        // color until the layer is remounted.
        pathOptions={pathOptions}
        eventHandlers={eventHandlers}
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
            {done ? "✓ Already marked" : "Tap a stop to mark this segment"}
          </div>
        </Tooltip>
      </Polyline>
      {isCoarsePointer && (
        <Polyline
          positions={seg.positions}
          pathOptions={hitTargetPathOptions}
          eventHandlers={eventHandlers}
        />
      )}
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
    </>
  );
});

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
  // Use pointer type rather than viewport width so the invisible hit-target
  // is only rendered for true touch devices (pointer: coarse). On tablets or
  // small desktop windows that have a mouse (pointer: fine), the hit-target
  // would otherwise sit on top of the visible polyline and block Tooltip hover.
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;

  const highlightKey = highlightedSegment
    ? `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`
    : null;
  return segments.map((seg) => {
    // Hops with no drawable polyline geometry (off-route stops, missing
    // agency data) are still tracked in the segment list so completion
    // stats stay accurate, but there's nothing to paint here.
    if (!seg.positions) return null;
    const done = effectiveCompleted.has(seg.key);
    const isHighlighted = highlightKey === seg.key;
    const isHovered = hoverSeg === seg.key;
    const isFresh = recentlyDone.has(seg.key);
    const color = isHighlighted ? "#facc15" : done ? "#22c55e" : routeColor;
    const weight = isHighlighted ? 8 : done ? 6 : isHovered ? 6 : 4;
    const opacity = isHighlighted ? 1 : done ? 1 : isHovered ? 0.95 : 0.55;
    return (
      <Segment
        key={seg.key}
        seg={seg}
        color={color}
        weight={weight}
        opacity={opacity}
        done={done}
        isFresh={isFresh}
        isCoarsePointer={isCoarsePointer}
        onSegmentClick={onSegmentClick}
        setHoverSeg={setHoverSeg}
      />
    );
  });
}

export default RouteSegmentsLayer;
