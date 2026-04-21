import React, { useEffect, useMemo, useRef, useState } from "react";
import { updateSegmentNotes, bulkDeleteSegments } from "../services/api";
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
  highlightedSegment,
  onClearHighlight,
}) {
  const [expandedRoute, setExpandedRoute] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [confirm, setConfirm] = useState(null); // { title, message, onConfirm, danger }
  const [view, setView] = useState("overview"); // overview | routes | achievements
  const routeRefs = useRef({});
  const journeyRefs = useRef({});

  // Build journeys per route once so we can locate the highlighted ride.
  const journeysByRoute = useMemo(() => {
    const map = {};
    for (const rp of progress) {
      map[rp.route_id] = groupIntoJourneys(rp.segments);
    }
    return map;
  }, [progress]);

  // Find the journey that contains the highlighted segment (if any).
  const highlightedJourney = useMemo(() => {
    if (!highlightedSegment) return null;
    const list = journeysByRoute[highlightedSegment.routeId];
    if (!list) return null;
    return (
      list.find((j) =>
        j.segments.some(
          (s) =>
            String(s.direction_id) === String(highlightedSegment.directionId) &&
            s.from_stop_id === highlightedSegment.fromStopId &&
            s.to_stop_id === highlightedSegment.toStopId,
        ),
      ) || null
    );
  }, [highlightedSegment, journeysByRoute]);

  const highlightedRoute = useMemo(() => {
    if (!highlightedSegment) return null;
    return (
      progress.find((rp) => rp.route_id === highlightedSegment.routeId) || null
    );
  }, [highlightedSegment, progress]);

  // When the user arrives on Progress with a highlight, jump to Routes view
  // and auto-expand the matching route + journey, then scroll into view.
  const lastAutoKey = useRef(null);
  useEffect(() => {
    if (!highlightedSegment || !highlightedRoute) return;
    const key = `${highlightedSegment.routeId}|${highlightedSegment.directionId}|${highlightedSegment.fromStopId}|${highlightedSegment.toStopId}`;
    if (lastAutoKey.current === key) return;
    lastAutoKey.current = key;
    setView("routes");
    setExpandedRoute(highlightedRoute.route_id);
    // Defer scroll until after the expansion renders.
    requestAnimationFrame(() => {
      const target =
        (highlightedJourney && journeyRefs.current[highlightedJourney.key]) ||
        routeRefs.current[highlightedRoute.route_id];
      if (target?.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [highlightedSegment, highlightedRoute, highlightedJourney]);

  const handleSaveNote = async (segId) => {
    await updateSegmentNotes(segId, noteText);
    setEditingNote(null);
    setNoteText("");
    onRefresh();
  };

  const askDeleteRide = (journey) =>
    setConfirm({
      title: "Remove this ride?",
      message:
        journey.stopCount > 2
          ? `All ${journey.stopCount - 1} segments in this ride (${journey.boardStop} → ${journey.alightStop}) will be removed from your progress.`
          : `This ride (${journey.boardStop} → ${journey.alightStop}) will be removed from your progress.`,
      danger: true,
      confirmLabel: "Remove ride",
      onConfirm: async () => {
        setConfirm(null);
        await bulkDeleteSegments({ ids: journey.segments.map((s) => s.id) });
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

      {highlightedSegment && highlightedRoute && (
        <div className="last-viewed-pill" role="status" aria-live="polite">
          <span
            className="last-viewed-color"
            style={{
              background: highlightedRoute.route_color
                ? `#${highlightedRoute.route_color}`
                : "var(--accent)",
            }}
          />
          <div className="last-viewed-text">
            <div className="last-viewed-label">Showing on map</div>
            <div className="last-viewed-name">
              {highlightedRoute.route_name}
              {highlightedJourney && (
                <>
                  {" · "}
                  <span className="last-viewed-stops">
                    {highlightedJourney.boardStop} →{" "}
                    {highlightedJourney.alightStop}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="last-viewed-actions">
            {highlightedJourney && (
              <button
                type="button"
                className="btn-small"
                onClick={() =>
                  onViewSegment?.(
                    highlightedRoute.route_id,
                    highlightedJourney.segments[0],
                  )
                }
                title="Recenter the map on this ride"
              >
                Recenter
              </button>
            )}
            <button
              type="button"
              className="btn-small last-viewed-clear"
              onClick={() => onClearHighlight?.()}
              title="Clear highlight"
              aria-label="Clear highlight"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
            const journeys = journeysByRoute[rp.route_id] || [];
            const isExpanded = expandedRoute === rp.route_id;
            const pct = Math.round(rp.completion_pct || 0);
            const isHighlightedRoute =
              highlightedSegment?.routeId === rp.route_id;
            const routeColor = rp.route_color
              ? `#${rp.route_color}`
              : "var(--accent)";

            // Build per-direction coverage: array of booleans, one per hop.
            const directions = (rp.directions || []).map((dir) => {
              // Set of completed "from|to" pairs for this direction.
              const completed = new Set();
              for (const seg of rp.segments) {
                if (String(seg.direction_id) === String(dir.direction_id)) {
                  completed.add(`${seg.from_stop_id}|${seg.to_stop_id}`);
                }
              }
              const stops = dir.stop_ids || [];
              const hops = [];
              for (let i = 0; i < stops.length - 1; i++) {
                hops.push(completed.has(`${stops[i]}|${stops[i + 1]}`));
              }
              return {
                directionId: dir.direction_id,
                directionName: dir.direction_name,
                hops,
              };
            });
            return (
              <div
                key={rp.route_id}
                ref={(el) => {
                  routeRefs.current[rp.route_id] = el;
                }}
                className={`progress-route ${isExpanded ? "expanded" : ""} ${
                  isHighlightedRoute ? "is-highlighted" : ""
                }`}
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
                    style={{ background: routeColor }}
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
                    {directions.length > 0 &&
                      directions.some((d) => d.hops.length > 0) && (
                        <div className="route-coverage">
                          {directions.map((d) => (
                            <div
                              key={d.directionId}
                              className="route-coverage-row"
                              title={`${d.directionName}: ${d.hops.filter(Boolean).length}/${d.hops.length} segments`}
                            >
                              <span className="route-coverage-label">
                                {d.directionName}
                              </span>
                              <div className="route-coverage-strip">
                                {d.hops.map((done, i) => (
                                  <span
                                    key={i}
                                    className={`route-tick ${done ? "is-done" : ""}`}
                                    style={
                                      done
                                        ? { background: routeColor }
                                        : undefined
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
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
                    {journeys.map((journey) => {
                      const isHighlightedJourney =
                        highlightedJourney?.key === journey.key;
                      const intermediate = Math.max(0, journey.stopCount - 2);
                      // Render up to 5 dots for the strip; large rides
                      // collapse the middle into a single "+N" pip.
                      const dots = [];
                      dots.push("board");
                      const maxMiddle = 3;
                      if (intermediate > 0) {
                        if (intermediate <= maxMiddle) {
                          for (let i = 0; i < intermediate; i++)
                            dots.push("mid");
                        } else {
                          dots.push("mid");
                          dots.push({ collapse: intermediate - 2 });
                          dots.push("mid");
                        }
                      }
                      dots.push("alight");
                      return (
                        <div
                          key={journey.key}
                          ref={(el) => {
                            journeyRefs.current[journey.key] = el;
                          }}
                          className={`ride-card ${
                            isHighlightedJourney ? "is-highlighted" : ""
                          }`}
                        >
                          <div className="ride-card-top">
                            <span className="ride-direction-tag">
                              {journey.directionName}
                            </span>
                            <span className="ride-date">{journey.date}</span>
                          </div>

                          <div className="ride-stops">
                            <span
                              className="ride-board"
                              title={journey.boardStop}
                            >
                              {journey.boardStop}
                            </span>
                            <span className="ride-arrow">→</span>
                            <span
                              className="ride-alight"
                              title={journey.alightStop}
                            >
                              {journey.alightStop}
                            </span>
                          </div>

                          <div className="ride-strip" aria-hidden="true">
                            {dots.map((d, i) => {
                              if (typeof d === "object") {
                                return (
                                  <React.Fragment key={i}>
                                    <span className="ride-dot ride-dot-collapse">
                                      +{d.collapse}
                                    </span>
                                    {i < dots.length - 1 && (
                                      <span className="ride-line" />
                                    )}
                                  </React.Fragment>
                                );
                              }
                              return (
                                <React.Fragment key={i}>
                                  <span className={`ride-dot ride-dot-${d}`} />
                                  {i < dots.length - 1 && (
                                    <span className="ride-line" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                            <span className="ride-stop-count">
                              {journey.stopCount} stops
                            </span>
                          </div>

                          {journey.notes && (
                            <div className="ride-note">📝 {journey.notes}</div>
                          )}

                          <div className="ride-actions">
                            <button
                              className="btn-small btn-view-map"
                              onClick={() =>
                                onViewSegment?.(
                                  rp.route_id,
                                  journey.segments[0],
                                )
                              }
                              title="Show this ride on the map"
                            >
                              🗺 Show on map
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
                            <button
                              className="btn-small btn-danger ride-delete"
                              onClick={() => askDeleteRide(journey)}
                              title="Remove this ride from your progress"
                              aria-label="Remove ride"
                            >
                              ✕
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
                        </div>
                      );
                    })}
                    <div className="progress-route-tools">
                      <button
                        className="btn-small btn-danger"
                        onClick={() => askWipeRoute(rp.route_id, rp.route_name)}
                        title="Delete every logged segment on this route"
                      >
                        Reset entire route
                      </button>
                    </div>
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
