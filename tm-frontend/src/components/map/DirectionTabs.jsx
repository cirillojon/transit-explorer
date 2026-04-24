import React from "react";

// Fallback arrow when the route detail didn't supply a precomputed one
// (no stop coordinates available). Uses keywords from the agency-supplied
// direction label and biases the two boxes to opposites by index.
function fallbackArrow(label, index) {
  const text = (label || "").toLowerCase();
  const has = (...words) => words.some((w) => text.includes(w));
  if (has("north", "northbound", " nb", "n-bound")) return "↑";
  if (has("south", "southbound", " sb", "s-bound")) return "↓";
  if (has("east", "eastbound", " eb", "e-bound")) return "→";
  if (has("west", "westbound", " wb", "w-bound")) return "←";
  if (has("inbound", "downtown", "uptown bound")) return "→";
  if (has("outbound")) return "←";
  if (has("up")) return "↑";
  if (has("down")) return "↓";
  return index === 0 ? "↑" : "↓";
}

function DirectionTabs({
  directionChoices,
  resolvedDirectionId,
  hasLockedDirection,
  onSelect,
}) {
  return (
    <div className={`direction-tabs ${hasLockedDirection ? "is-locked" : ""}`}>
      {directionChoices.map((dir, idx) => {
        const arrow = dir.arrow || fallbackArrow(dir.label, idx);
        return (
          <button
            key={dir.directionId}
            className={`direction-tab ${resolvedDirectionId === dir.directionId ? "active" : ""} ${hasLockedDirection && resolvedDirectionId === dir.directionId ? "locked" : ""} ${hasLockedDirection && resolvedDirectionId !== dir.directionId ? "inactive" : ""}`.trim()}
            onClick={() => onSelect(dir.directionId)}
          >
            <span className="direction-tab-label">
              <span className="direction-tab-arrow" aria-hidden="true">
                {arrow}
              </span>
              {dir.label}
            </span>
            <span className="direction-tab-sub" title={dir.lastStopName || ""}>
              {hasLockedDirection && resolvedDirectionId === dir.directionId
                ? dir.lastStopName
                  ? `Locked toward ${dir.lastStopName}`
                  : "Locked for current trip"
                : dir.lastStopName
                  ? `Toward ${dir.lastStopName}`
                  : "Tap to follow this direction"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default DirectionTabs;
