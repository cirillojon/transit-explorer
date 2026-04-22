import React, { useEffect, useState } from "react";
import { formatDuration } from "./mapUtils";

function PickOverlay({
  pickState,
  marking,
  liveTripMs,
  activeDirectionMeta,
  onUndo,
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Reset to expanded whenever a new boarding pick begins.
  useEffect(() => {
    setCollapsed(false);
  }, [pickState?.fromId]);

  if (marking) {
    return (
      <div className="pick-overlay">
        <span className="spinner" /> Saving…
      </div>
    );
  }
  if (!pickState) return null;

  if (collapsed) {
    return (
      <div
        className="pick-overlay is-collapsed"
        role="button"
        tabIndex={0}
        onClick={() => setCollapsed(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed(false);
          }
        }}
      >
        <span className="pick-dot boarding" />
        <span className="pick-prompt">Tap ending stop</span>
        {pickState.boardedAt && (
          <span className="pick-timer" title="Time since boarding">
            ⏱ {formatDuration(liveTripMs) || "0s"}
          </span>
        )}
        <button
          type="button"
          className="pick-collapse-toggle"
          aria-label="Expand boarding details"
          onClick={(e) => {
            e.stopPropagation();
            setCollapsed(false);
          }}
        >
          ▴
        </button>
      </div>
    );
  }

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
      <button
        type="button"
        className="pick-collapse-toggle"
        aria-label="Minimize boarding details"
        onClick={() => setCollapsed(true)}
      >
        ▾
      </button>
    </div>
  );
}

export default PickOverlay;
