import React from "react";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

function RecentActivity({ activity = [], onJump }) {
  if (!activity.length) {
    return (
      <div className="recent-activity">
        <h3>Recent activity</h3>
        <div className="empty-state mini">
          No rides yet — go board something!
        </div>
      </div>
    );
  }
  return (
    <div className="recent-activity">
      <h3>Recent activity</h3>
      <div className="activity-list">
        {activity.map((a, i) => (
          <button
            key={`${a.route_id}-${a.from_stop_id}-${a.to_stop_id}-${i}`}
            className="activity-item"
            onClick={() =>
              onJump?.(a.route_id, {
                direction_id: a.direction_id,
                from_stop_id: a.from_stop_id,
                to_stop_id: a.to_stop_id,
              })
            }
            title="View on map"
          >
            <span
              className="activity-badge"
              style={{
                background: a.route_color
                  ? `#${a.route_color}`
                  : "var(--accent)",
              }}
            >
              {a.route_name}
            </span>
            <div className="activity-body">
              <div className="activity-stops">
                <span>{a.from_stop_name || a.from_stop_id}</span>
                <span className="activity-arrow">→</span>
                <span>{a.to_stop_name || a.to_stop_id}</span>
              </div>
              <div className="activity-meta">
                <span>
                  {a.hops} hop{a.hops > 1 ? "s" : ""}
                </span>
                <span>·</span>
                <span>{timeAgo(a.completed_at)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default RecentActivity;
