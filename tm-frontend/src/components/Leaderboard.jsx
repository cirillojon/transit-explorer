import React, { useEffect, useState } from "react";
import { fetchLeaderboard } from "../services/api";

const PERIODS = [
  { key: "all", label: "All time" },
  { key: "month", label: "This month" },
  { key: "week", label: "This week" },
];

function medal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return null;
}

function Leaderboard({ currentUserStats, onSelectUser }) {
  const [period, setPeriod] = useState("all");
  const [data, setData] = useState({ leaderboard: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLeaderboard({ period, limit: 50 })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setErr(null);
        }
      })
      .catch((e) => !cancelled && setErr(e.message || "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [period]);

  return (
    <div className="leaderboard">
      <div className="lb-header">
        <h3>Top Explorers</h3>
        <div className="lb-period-row">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              className={`chip ${period === p.key ? "chip-active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {currentUserStats?.rank && (
        <div className="lb-myrank">
          <span className="lb-myrank-label">Your rank</span>
          <span className="lb-myrank-value">#{currentUserStats.rank}</span>
          <span className="lb-myrank-meta">
            {currentUserStats.total_segments} segments
          </span>
        </div>
      )}

      {loading && <SkeletonRows count={6} />}
      {err && <div className="error">{err}</div>}

      {!loading && !err && data.leaderboard.length === 0 && (
        <div className="empty-state mini">No explorers yet — be the first!</div>
      )}

      {!loading && !err && data.leaderboard.length > 0 && (
        <div className="leaderboard-list">
          {data.leaderboard.map((entry) => (
            <button
              key={entry.user_id}
              type="button"
              className={`leaderboard-entry rank-${entry.rank} leaderboard-entry-button`}
              onClick={() => onSelectUser?.(entry)}
              aria-label={`View ${entry.display_name}'s progress`}
            >
              <span className="lb-rank">
                {medal(entry.rank) || `#${entry.rank}`}
              </span>
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={`${entry.display_name || "User"} avatar`}
                  className="lb-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="lb-avatar lb-avatar-placeholder">
                  {(entry.display_name || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="lb-info">
                <span className="lb-name">{entry.display_name}</span>
                <span className="lb-stats">
                  {entry.total_segments} segments · {entry.total_routes} routes
                </span>
              </div>
              <div className="lb-trophy">
                {entry.total_segments >= 100 && "💯"}
              </div>
              <span className="lb-chevron" aria-hidden>
                ›
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRows({ count = 5 }) {
  return (
    <div className="leaderboard-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="leaderboard-entry skeleton-entry">
          <span className="skeleton skeleton-rank" />
          <span className="skeleton skeleton-avatar" />
          <div className="lb-info" style={{ flex: 1 }}>
            <span className="skeleton skeleton-line skeleton-line-w70" />
            <span className="skeleton skeleton-line skeleton-line-w40" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Leaderboard;
