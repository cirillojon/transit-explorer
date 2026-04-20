import React, { useState } from "react";
import {
  updateSegmentNotes,
  deleteSegment,
  bulkDeleteSegments,
} from "../services/api";
import StatsCard from "./StatsCard";
import Achievements from "./Achievements";
import RecentActivity from "./RecentActivity";
import ConfirmDialog from "./ConfirmDialog";

/* Group consecutive same-direction hops into journey objects. */
function groupIntoJourneys(segments) {
  if (!segments.length) return [];
  const sorted = [...segments].sort(
    (a, b) => new Date(a.completed_at) - new Date(b.completed_at),
  );
  const journeys = [];
  let run = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prev = run[run.length - 1];
    const cur = sorted[i];
    if (
      cur.direction_id === prev.direction_id &&
      cur.from_stop_id === prev.to_stop_id
    ) {
      run.push(cur);
    } else {
      journeys.push(makeJourney(run));
      run = [cur];
    }
  }
  journeys.push(makeJourney(run));
  return journeys.reverse();
}

function makeJourney(segs) {
  const first = segs[0];
  const last = segs[segs.length - 1];
  return {
    key: `${first.direction_id}-${first.from_stop_id}-${last.to_stop_id}-${first.completed_at}`,
    directionId: first.direction_id,
    directionName: first.direction_name || first.direction_id,
    boardStop: first.from_stop_name || first.from_stop_id,
    alightStop: last.to_stop_name || last.to_stop_id,
    stopCount: segs.length + 1,
    date: new Date(first.completed_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year:
        new Date(first.completed_at).getFullYear() !== new Date().getFullYear()
          ? "numeric"
          : undefined,
    }),
    notes: segs.find((s) => s.notes)?.notes || "",
    segments: segs,
  };
}

function UserProgress({
  progress,
  stats,
  profile,
  activity,
  onRefresh,
  onViewSegment,
}) {
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [expandedJourney, setExpandedJourney] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, danger }
  const [view, setView] = useState("overview"); // overview | routes | achievements

  const handleSaveNote = async (segId) => {
    await updateSegmentNotes(segId, noteText);
    setEditingNote(null);
    setNoteText("");
    onRefresh();
  };

  const askDeleteHop = (segId) =>
    setConfirm({
      title: "Remove this segment?",
      message:
        "This single stop-to-stop hop will be removed from your progress.",
      danger: true,
      confirmLabel: "Remove",
      onConfirm: async () => {
        setConfirm(null);
        await deleteSegment(segId);
        onRefresh();
      },
    });

  const askWipeRoute = (rid, name) =>
    setConfirm({
      title: `Reset all progress on ${name}?`,
      message: "Every segment you've marked on this route will be deleted.",
      danger: true,
      confirmLabel: "Reset route",
      onConfirm: async () => {
        setConfirm(null);
        await bulkDeleteSegments({ route_id: rid, confirm: true });
        onRefresh();
      },
    });

  return (
    <div className="user-progress">
      <StatsCard stats={stats} profile={profile} />

      <div className="seg-tabs">
        <button
          className={`seg-tab ${view === "overview" ? "active" : ""}`}
          onClick={() => setView("overview")}
        >
          Overview
        </button>
        <button
          className={`seg-tab ${view === "routes" ? "active" : ""}`}
          onClick={() => setView("routes")}
        >
          Routes ({progress.length})
        </button>
        <button
          className={`seg-tab ${view === "achievements" ? "active" : ""}`}
          onClick={() => setView("achievements")}
        >
          Badges
        </button>
      </div>

      {view === "overview" && (
        <RecentActivity activity={activity} onJump={onViewSegment} />
      )}

      {view === "achievements" && (
        <Achievements achievements={stats?.achievements || []} />
      )}

      {view === "routes" && (
        <div className="progress-routes">
          {progress.map((rp) => {
            const journeys = groupIntoJourneys(rp.segments);
            const isExpanded = expandedRoute === rp.route_id;
            const pct = Math.round(rp.completion_pct || 0);
            return (
              <div
                key={rp.route_id}
                className={`progress-route ${isExpanded ? "expanded" : ""}`}
              >
                <button
                  type="button"
                  className="progress-route-header"
                  onClick={() =>
                    setExpandedRoute(isExpanded ? null : rp.route_id)
                  }
                >
                  <span
                    className="route-color-bar"
                    style={{
                      background: rp.route_color
                        ? `#${rp.route_color}`
                        : "var(--accent)",
                    }}
                  />
                  <div className="progress-route-main">
                    <div className="progress-route-name">
                      <span>{rp.route_name}</span>
                      {pct >= 100 && (
                        <span className="progress-pill complete">
                          ✓ Complete
                        </span>
                      )}
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${pct >= 100 ? "is-complete" : ""}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="progress-route-meta">
                      <span>
                        {rp.completed_segments}/{rp.total_segments} segments
                      </span>
                      <span>·</span>
                      <span>
                        {journeys.length} ride{journeys.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="progress-route-pct">{pct}%</span>
                </button>

                {isExpanded && (
                  <div className="progress-segments">
                    <div className="progress-route-tools">
                      <button
                        className="btn-small btn-danger"
                        onClick={() => askWipeRoute(rp.route_id, rp.route_name)}
                      >
                        Reset route
                      </button>
                    </div>
                    {journeys.map((journey) => {
                      const isJExpanded = expandedJourney === journey.key;
                      return (
                        <div key={journey.key} className="journey-item">
                          <button
                            type="button"
                            className="journey-header"
                            onClick={() =>
                              setExpandedJourney(
                                isJExpanded ? null : journey.key,
                              )
                            }
                          >
                            <div className="journey-direction">
                              {journey.directionName}
                            </div>
                            <div className="journey-stops">
                              <span className="journey-board">
                                ● {journey.boardStop}
                              </span>
                              <span className="journey-arrow">→</span>
                              <span className="journey-alight">
                                ◆ {journey.alightStop}
                              </span>
                            </div>
                            <div className="journey-meta">
                              <span>{journey.stopCount} stops</span>
                              <span className="journey-date">
                                {journey.date}
                              </span>
                              <span className="journey-expand-icon">
                                {isJExpanded ? "▲" : "▼"}
                              </span>
                            </div>
                            {journey.notes && (
                              <div className="journey-note">
                                📝 {journey.notes}
                              </div>
                            )}
                          </button>

                          <div className="segment-actions journey-actions">
                            <button
                              className="btn-small btn-view-map"
                              onClick={() =>
                                onViewSegment?.(
                                  rp.route_id,
                                  journey.segments[0],
                                )
                              }
                            >
                              🗺 Map
                            </button>
                            <button
                              className="btn-small"
                              onClick={() => {
                                setEditingNote(journey.key);
                                setNoteText(journey.segments[0].notes || "");
                              }}
                            >
                              {journey.notes ? "Edit note" : "Add note"}
                            </button>
                          </div>

                          {editingNote === journey.key && (
                            <div className="note-edit">
                              <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="Write a note about this ride..."
                                rows={2}
                                autoFocus
                              />
                              <div className="note-edit-actions">
                                <button
                                  className="btn-small btn-primary"
                                  onClick={() =>
                                    handleSaveNote(journey.segments[0].id)
                                  }
                                >
                                  Save
                                </button>
                                <button
                                  className="btn-small"
                                  onClick={() => setEditingNote(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {isJExpanded && (
                            <div className="hop-list">
                              {journey.segments.map((seg) => (
                                <div key={seg.id} className="hop-item">
                                  <span className="hop-stops">
                                    {seg.from_stop_name}
                                    <span className="hop-arrow">→</span>
                                    {seg.to_stop_name}
                                  </span>
                                  <button
                                    className="btn-small btn-danger hop-remove"
                                    onClick={() => askDeleteHop(seg.id)}
                                    title="Remove this hop"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {progress.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">🚏</div>
              <div>No segments completed yet.</div>
              <div className="empty-state-sub">
                Pick a route on the map and tap two stops to mark a journey.
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onCancel={() => setConfirm(null)}
        onConfirm={confirm?.onConfirm}
      />
    </div>
  );
}

export default UserProgress;
