import React from "react";

function Achievements({ achievements = [] }) {
  if (!achievements.length) return null;
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div className="achievements">
      <div className="ach-header">
        <h3>Achievements</h3>
        <span className="ach-counter">
          {unlocked.length} / {achievements.length}
        </span>
      </div>
      <div className="ach-grid">
        {[...unlocked, ...locked].map((a) => (
          <div
            key={a.id}
            className={`ach-tile ${a.unlocked ? "unlocked" : "locked"}`}
            title={a.description}
          >
            <div className="ach-icon">{a.icon}</div>
            <div className="ach-meta">
              <div className="ach-label">{a.label}</div>
              <div className="ach-desc">{a.description}</div>
              {!a.unlocked && (
                <div className="ach-progress-track">
                  <div
                    className="ach-progress-fill"
                    style={{
                      width: `${(a.progress / a.threshold) * 100}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Achievements;
