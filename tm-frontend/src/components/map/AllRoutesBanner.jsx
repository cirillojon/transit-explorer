import React from "react";

function AllRoutesBanner({
  allProgressDetails,
  allRouteStats,
  hiddenRouteIds,
  onToggleRoute,
  onShowAllRoutes,
  riddenOnly,
  onToggleRiddenOnly,
  onClose,
}) {
  const hiddenSet = hiddenRouteIds || new Set();
  const visibleCount = allProgressDetails.length - hiddenSet.size;
  const anyHidden = hiddenSet.size > 0;

  return (
    <div className="all-routes-banner">
      <div className="all-routes-banner-header">
        <span className="all-routes-banner-text">
          🗺 Viewing {visibleCount} of {allProgressDetails.length} in-progress
          route{allProgressDetails.length !== 1 ? "s" : ""}
        </span>
        <div className="all-routes-banner-actions">
          <label
            className="all-routes-banner-toggle"
            title="Hide segments you haven't ridden yet"
          >
            <input
              type="checkbox"
              checked={!!riddenOnly}
              onChange={() => onToggleRiddenOnly?.()}
            />
            <span>Ridden only</span>
          </label>
          {anyHidden && (
            <button
              type="button"
              className="all-routes-banner-clear"
              onClick={() => onShowAllRoutes?.()}
              title="Show every route again"
            >
              Show all
            </button>
          )}
          <button
            type="button"
            className="all-routes-banner-clear"
            onClick={() => onClose?.()}
            aria-label="Close all-routes view"
          >
            ✕ Close
          </button>
        </div>
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
        {allRouteStats.map((r) => {
          const isHidden = hiddenSet.has(r.id);
          return (
            <button
              key={r.id}
              type="button"
              className={`all-routes-route-chip ${isHidden ? "is-hidden" : ""}`}
              onClick={() => onToggleRoute?.(r.id)}
              aria-pressed={!isHidden}
              title={isHidden ? `Show ${r.name}` : `Hide ${r.name}`}
            >
              <i
                aria-hidden="true"
                className="all-routes-legend-dot"
                style={{ background: r.color }}
              />
              {r.name}
              <span className="all-routes-route-chip-pct">{r.pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default AllRoutesBanner;
