import React from "react";

function AllRoutesBanner({ allProgressDetails, allRouteStats, onClose }) {
  return (
    <div className="all-routes-banner">
      <div className="all-routes-banner-header">
        <span className="all-routes-banner-text">
          🗺 Viewing all {allProgressDetails.length} in-progress route
          {allProgressDetails.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          className="all-routes-banner-clear"
          onClick={() => onClose?.()}
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
  );
}

export default AllRoutesBanner;
