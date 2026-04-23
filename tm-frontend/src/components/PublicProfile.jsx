import React, { useEffect, useMemo, useState } from "react";
import { fetchUserProfile } from "../services/api";
import { groupIntoJourneys } from "./journeyGrouping";

function PublicProfile({ userId, fallbackEntry, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [view, setView] = useState("overview"); // overview | routes | achievements

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetchUserProfile(userId)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setErr(e?.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Lock body scroll while modal is open + close on Escape.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const user = data?.user || {
    display_name: fallbackEntry?.display_name,
    avatar_url: fallbackEntry?.avatar_url,
  };
  const totalSegments =
    data?.total_segments ?? fallbackEntry?.total_segments ?? 0;
  const totalRoutes = data?.total_routes ?? fallbackEntry?.total_routes ?? 0;
  const completedRoutes = data?.completed_routes ?? 0;
  const progress = data?.progress || [];
  const achievements = data?.achievements || [];

  const journeysByRoute = useMemo(() => {
    const map = {};
    for (const rp of progress) {
      map[rp.route_id] = groupIntoJourneys(rp.segments);
    }
    return map;
  }, [progress]);

  const unlocked = achievements.filter((a) => a.unlocked);

  return (
    <div
      className="public-profile-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${user.display_name || "Explorer"}'s progress`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="public-profile-modal">
        <header className="pp-header">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`${user.display_name || "User"} avatar`}
              className="pp-avatar"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="pp-avatar pp-avatar-placeholder">
              {(user.display_name || "?")[0].toUpperCase()}
            </div>
          )}
          <div className="pp-header-info">
            <h2>{user.display_name || "Anonymous"}</h2>
            <span className="pp-readonly-badge">Read-only profile</span>
          </div>
          <button
            type="button"
            className="pp-close"
            onClick={onClose}
            aria-label="Close profile"
          >
            ✕
          </button>
        </header>

        {loading && (
          <div className="pp-body">
            <div className="empty-state mini">Loading profile…</div>
          </div>
        )}
        {err && (
          <div className="pp-body">
            <div className="error">{err}</div>
          </div>
        )}

        {!loading && !err && (
          <>
            <div className="pp-stats-row">
              <div className="pp-stat">
                <span className="pp-stat-value">{totalSegments}</span>
                <span className="pp-stat-label">segments</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">{totalRoutes}</span>
                <span className="pp-stat-label">routes</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">{completedRoutes}</span>
                <span className="pp-stat-label">completed</span>
              </div>
              <div className="pp-stat">
                <span className="pp-stat-value">{unlocked.length}</span>
                <span className="pp-stat-label">badges</span>
              </div>
            </div>

            <nav className="pp-tabs" role="tablist">
              {[
                { key: "overview", label: "Overview" },
                { key: "routes", label: `Routes (${progress.length})` },
                {
                  key: "achievements",
                  label: `Badges (${unlocked.length})`,
                },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={view === t.key}
                  className={`pp-tab ${view === t.key ? "pp-tab-active" : ""}`}
                  onClick={() => setView(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="pp-body">
              {view === "overview" && (
                <PPOverview
                  progress={progress}
                  achievements={unlocked.slice(0, 6)}
                />
              )}
              {view === "routes" && (
                <PPRoutes
                  progress={progress}
                  journeysByRoute={journeysByRoute}
                />
              )}
              {view === "achievements" && (
                <PPAchievements achievements={achievements} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PPOverview({ progress, achievements }) {
  const top = progress.slice(0, 5);
  if (!progress.length) {
    return (
      <div className="empty-state mini">
        This explorer hasn't logged any rides yet.
      </div>
    );
  }
  return (
    <div className="pp-overview">
      <section>
        <h3 className="pp-section-title">Top routes</h3>
        <div className="pp-route-mini-list">
          {top.map((r) => (
            <div key={r.route_id} className="pp-route-mini">
              <span
                className="pp-route-pill"
                style={{
                  background: r.route_color ? `#${r.route_color}` : "#64748b",
                }}
              >
                {r.route_name}
              </span>
              <div className="pp-route-mini-bar">
                <div
                  className="pp-route-mini-fill"
                  style={{
                    width: `${Math.min(100, r.completion_pct)}%`,
                    background: r.route_color ? `#${r.route_color}` : "#60a5fa",
                  }}
                />
              </div>
              <span className="pp-route-mini-pct">
                {Math.round(r.completion_pct)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {achievements.length > 0 && (
        <section>
          <h3 className="pp-section-title">Recent badges</h3>
          <div className="pp-badge-row">
            {achievements.map((a) => (
              <div key={a.id} className="pp-badge" title={a.description}>
                <span className="pp-badge-icon">{a.icon}</span>
                <span className="pp-badge-label">{a.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PPRoutes({ progress, journeysByRoute }) {
  const [openId, setOpenId] = useState(null);
  if (!progress.length) {
    return (
      <div className="empty-state mini">
        This explorer hasn't logged any rides yet.
      </div>
    );
  }
  return (
    <div className="pp-route-list">
      {progress.map((r) => {
        const isOpen = openId === r.route_id;
        const journeys = journeysByRoute[r.route_id] || [];
        return (
          <div key={r.route_id} className="pp-route-card">
            <button
              type="button"
              className="pp-route-head"
              onClick={() => setOpenId(isOpen ? null : r.route_id)}
              aria-expanded={isOpen}
            >
              <span
                className="pp-route-pill"
                style={{
                  background: r.route_color ? `#${r.route_color}` : "#64748b",
                }}
              >
                {r.route_name}
              </span>
              <div className="pp-route-meta">
                <span>
                  {r.completed_segments}/{r.total_segments} segments
                </span>
                <span className="pp-route-pct">
                  {Math.round(r.completion_pct)}%
                </span>
              </div>
              <span className="pp-caret" aria-hidden>
                {isOpen ? "▾" : "▸"}
              </span>
            </button>
            <div className="pp-route-bar">
              <div
                className="pp-route-bar-fill"
                style={{
                  width: `${Math.min(100, r.completion_pct)}%`,
                  background: r.route_color ? `#${r.route_color}` : "#60a5fa",
                }}
              />
            </div>
            {isOpen && (
              <div className="pp-route-body">
                {journeys.length === 0 ? (
                  <div className="empty-state mini">No rides recorded.</div>
                ) : (
                  <ul className="pp-journey-list">
                    {journeys.map((j) => (
                      <li key={j.key} className="pp-journey">
                        <div className="pp-journey-line">
                          <span className="pp-journey-stop">{j.boardStop}</span>
                          <span className="pp-journey-arrow">→</span>
                          <span className="pp-journey-stop">
                            {j.alightStop}
                          </span>
                        </div>
                        <div className="pp-journey-meta">
                          <span>{j.directionName}</span>
                          <span>·</span>
                          <span>
                            {j.stopCount} stop{j.stopCount === 1 ? "" : "s"}
                          </span>
                          <span>·</span>
                          <span>{j.date}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PPAchievements({ achievements }) {
  if (!achievements.length) {
    return <div className="empty-state mini">No badges yet.</div>;
  }
  return (
    <div className="pp-achievement-grid">
      {achievements.map((a) => (
        <div
          key={a.id}
          className={`pp-achievement ${a.unlocked ? "unlocked" : "locked"}`}
        >
          <div className="pp-achievement-icon">{a.icon}</div>
          <div className="pp-achievement-info">
            <div className="pp-achievement-label">{a.label}</div>
            <div className="pp-achievement-desc">{a.description}</div>
            {!a.unlocked && (
              <div className="pp-achievement-progress">
                {a.progress}/{a.threshold}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PublicProfile;
