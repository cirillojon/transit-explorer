import React from "react";
import {
  ROUTE_TYPE_ICONS,
  ROUTE_TYPE_LABELS,
  formatDuration,
} from "./mapUtils";

function MapLegend({
  selectedRoute,
  routeColor,
  legendCollapsed,
  setLegendCollapsed,
  completionStats,
  activeDirectionMeta,
  pickState,
  justCompleted,
  tripStats,
}) {
  return (
    <div className={`map-legend ${legendCollapsed ? "is-collapsed" : ""}`}>
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
            <span className="map-legend-sub"> · {selectedRoute.long_name}</span>
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
          <span className="map-legend-direction-label">Logging direction</span>
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
              {activeDirectionMeta || pickState || justCompleted ? "✓" : "1"}
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
            <i className="dot pending" style={{ background: routeColor }} />{" "}
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
  );
}

export default MapLegend;
