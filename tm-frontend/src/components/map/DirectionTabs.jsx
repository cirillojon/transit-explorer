import React from "react";

function DirectionTabs({
  directionChoices,
  resolvedDirectionId,
  hasLockedDirection,
  onSelect,
}) {
  return (
    <div className={`direction-tabs ${hasLockedDirection ? "is-locked" : ""}`}>
      {directionChoices.map((dir) => (
        <button
          key={dir.directionId}
          className={`direction-tab ${resolvedDirectionId === dir.directionId ? "active" : ""} ${hasLockedDirection && resolvedDirectionId === dir.directionId ? "locked" : ""} ${hasLockedDirection && resolvedDirectionId !== dir.directionId ? "inactive" : ""}`.trim()}
          onClick={() => onSelect(dir.directionId)}
        >
          <span className="direction-tab-label">{dir.label}</span>
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
      ))}
    </div>
  );
}

export default DirectionTabs;
