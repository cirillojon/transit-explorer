import React from "react";
import { getStopPickStatus } from "./mapUtils";

function StopSearch({
  pickState,
  stopSearch,
  setStopSearch,
  stopSearchResults,
  boardingOrderIndex,
  onPick,
}) {
  return (
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
            pickState ? "Find your ending stop…" : "Find a stop on this route…"
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
              const status = getStopPickStatus(
                s,
                pickState,
                boardingOrderIndex,
              );
              const isBoardingChoice = status === "boarding";
              const isUnavailableChoice = status === "upstream";
              return (
                <button
                  type="button"
                  key={`${s.directionId}-${s.id}`}
                  className={`stop-search-result ${isUnavailableChoice ? "is-unavailable" : pickState ? "is-available" : ""}`.trim()}
                  onClick={() => onPick(s)}
                  disabled={isBoardingChoice || isUnavailableChoice}
                  title={
                    isBoardingChoice
                      ? "This is your boarding stop"
                      : isUnavailableChoice
                        ? "Behind boarding: choose a stop ahead"
                        : pickState
                          ? "Mark as ending stop"
                          : "Board here"
                  }
                >
                  <span className="stop-search-result-name">{s.name}</span>
                  {pickState && !isBoardingChoice && (
                    <span className="stop-search-result-status">
                      {isUnavailableChoice ? "Unavailable" : "Available"}
                    </span>
                  )}
                  {s.isTerminus && (
                    <span className="stop-search-result-tag">Terminus</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default StopSearch;
