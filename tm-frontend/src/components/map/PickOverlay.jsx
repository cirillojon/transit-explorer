import React from "react";
import { formatDuration } from "./mapUtils";

function PickOverlay({
  pickState,
  marking,
  liveTripMs,
  activeDirectionMeta,
  onUndo,
}) {
  if (marking) {
    return (
      <div className="pick-overlay">
        <span className="spinner" /> Saving…
      </div>
    );
  }
  if (!pickState) return null;
  return (
    <div className="pick-overlay">
      <div className="pick-info">
        <span className="pick-dot boarding" />
        <span className="pick-label">
          Boarded at <strong>{pickState.fromName}</strong>
        </span>
      </div>
      <span className="pick-arrow">→</span>
      <span className="pick-prompt">Now tap your ending stop</span>
      {pickState.boardedAt && (
        <span
          className="pick-timer"
          title="Time since you tapped your boarding stop"
        >
          ⏱ {formatDuration(liveTripMs) || "0s"}
        </span>
      )}
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
        onClick={onUndo}
        title="Undo boarding (Esc)"
      >
        ↶ Undo boarding
      </button>
    </div>
  );
}

export default PickOverlay;
