import React from "react";

/**
 * Compact stats hero — totals + global rank + 14d sparkline + top routes.
 * Pulls from /api/me/stats (passed in via props for easy reuse).
 */
function StatsCard({ stats, profile }) {
  if (!stats) return null;

  const totalSegments = stats.total_segments ?? profile?.total_segments ?? 0;
  const totalRoutes = stats.total_routes ?? profile?.total_routes ?? 0;
  const completedRoutes = stats.completed_routes ?? 0;
  const rank = stats.rank;
  const spark = stats.activity_14d || [];
  const sparkMax = Math.max(1, ...spark.map((d) => d.count));
  const recent7 = spark.slice(-7).reduce((s, d) => s + d.count, 0);

  return (
    <div className="stats-card">
      <div className="stats-row">
        <Stat value={totalSegments} label="Segments" accent="blue" />
        <Stat value={totalRoutes} label="Routes ridden" accent="purple" />
        <Stat value={completedRoutes} label="Routes 100%" accent="green" />
        <Stat
          value={rank ? `#${rank}` : "—"}
          label="Global rank"
          accent="yellow"
        />
      </div>

      <div className="spark-wrap">
        <div className="spark-header">
          <span>Last 14 days</span>
          <span className="spark-recent">{recent7} this week</span>
        </div>
        <div className="spark-bars">
          {spark.map((d) => (
            <div
              key={d.date}
              className="spark-col"
              title={`${d.date}: ${d.count}`}
            >
              <div
                className="spark-bar"
                style={{
                  height: `${(d.count / sparkMax) * 100}%`,
                  opacity: d.count === 0 ? 0.18 : 1,
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {stats.top_routes?.length > 0 && (
        <div className="top-routes">
          <div className="top-routes-header">Top routes</div>
          <div className="top-routes-list">
            {stats.top_routes.map((r) => (
              <div key={r.route_id} className="top-route-row">
                <span
                  className="top-route-badge"
                  style={{
                    background: r.route_color
                      ? `#${r.route_color}`
                      : "var(--accent)",
                  }}
                >
                  {r.route_name}
                </span>
                <div className="top-route-bar-wrap">
                  <div
                    className="top-route-bar-fill"
                    style={{
                      width: `${Math.min(100, r.completion_pct ?? 0)}%`,
                      background: r.route_color
                        ? `#${r.route_color}`
                        : "var(--accent)",
                    }}
                  />
                </div>
                <span className="top-route-pct">
                  {r.completion_pct != null ? `${r.completion_pct}%` : `${r.segments} hops`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, accent }) {
  return (
    <div className={`stat-pill stat-${accent}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default StatsCard;
