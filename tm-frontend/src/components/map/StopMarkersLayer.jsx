import React from "react";
import { Marker, CircleMarker, Tooltip } from "react-leaflet";
import { getStopPickStatus } from "./mapUtils";

const MOBILE_RADIUS_INCREASE = 4;

function StopMarkersLayer({
  visibleStops,
  pickState,
  boardingOrderIndex,
  routeColor,
  boardingIcon,
  activeDirectionMeta,
  stopMarkerRefs,
  onStopClick,
  showToast,
  isMobile,
}) {
  return visibleStops.map((stop) => {
    const status = getStopPickStatus(stop, pickState, boardingOrderIndex);
    const isFrom = status === "boarding";
    const isValidCandidate = status === "candidate";
    const isUpstreamInvalid = status === "upstream";

    if (isFrom) {
      return (
        <Marker
          key={`${stop.directionId}-${stop.id}`}
          position={[stop.lat, stop.lon]}
          icon={boardingIcon}
          ref={(el) => {
            if (el)
              stopMarkerRefs.current[`${stop.directionId}-${stop.id}`] = el;
          }}
          eventHandlers={{
            click: () => onStopClick(stop.directionId, stop.id, stop.name),
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
        className={`stop-marker ${isValidCandidate ? "is-alight-candidate" : ""} ${isUpstreamInvalid ? "is-unavailable" : ""}`.trim()}
        radius={
          (isUpstreamInvalid ? 4 : stop.isTerminus ? 7 : isValidCandidate ? 8 : 5) +
          (isMobile ? MOBILE_RADIUS_INCREASE : 0)
        }
        fillColor={
          isUpstreamInvalid
            ? "#334155"
            : isValidCandidate
              ? "#22d3ee"
              : stop.isTerminus
                ? routeColor
                : "#fff"
        }
        color={
          isUpstreamInvalid
            ? "#475569"
            : isValidCandidate
              ? "#7dd3fc"
              : routeColor
        }
        weight={isValidCandidate ? 3.5 : 2}
        opacity={isUpstreamInvalid ? 0.7 : 1}
        fillOpacity={isUpstreamInvalid ? 0.2 : 1}
        dashArray={isUpstreamInvalid ? "2 3" : undefined}
        ref={(el) => {
          if (el) stopMarkerRefs.current[`${stop.directionId}-${stop.id}`] = el;
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
            onStopClick(stop.directionId, stop.id, stop.name);
          },
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
          <span style={{ fontWeight: 500 }}>{stop.name}</span>
          {stop.isTerminus && (
            <span style={{ fontSize: 10, color: "#94a3b8" }}> · Terminus</span>
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
              <span style={{ fontSize: 11, color: "#22d3ee" }}>
                Available ending stop
              </span>
            </>
          )}
          {isUpstreamInvalid && (
            <>
              <br />
              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                Behind boarding — can&apos;t get off here
              </span>
            </>
          )}
        </Tooltip>
      </CircleMarker>
    );
  });
}

export default StopMarkersLayer;
