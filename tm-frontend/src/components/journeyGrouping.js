/* Group hops into journey objects.
 *
 * One "journey" = the set of hops created by a single POST /me/segments.
 * The backend stamps every row in that POST with the same `completed_at`
 * microsecond, so we bucket by `(direction_id|completed_at)`. Within a
 * bucket we sort hops along the route's stop sequence (passed in via
 * `directions`) so the boarding and alighting stops are correct even when
 * the rows arrive out of order from the DB.
 *
 * Falls back to contiguity-based splitting only if a bucket genuinely
 * isn't a single contiguous run after sorting (very unlikely; would
 * require duplicate POSTs with identical timestamps).
 */
export function groupIntoJourneys(segments, directions = []) {
  if (!segments.length) return [];

  // Build per-direction stop_id -> index lookup so we can sort hops along
  // the route. Falls back to {} if a direction isn't in the metadata.
  const stopIndexByDir = {};
  for (const d of directions) {
    const idx = {};
    const stops = d.stop_ids || [];
    for (let i = 0; i < stops.length; i++) idx[stops[i]] = i;
    stopIndexByDir[String(d.direction_id)] = idx;
  }

  // Bucket by trip key. We use a Map to preserve first-seen order.
  const buckets = new Map();
  for (const s of segments) {
    const key = `${s.direction_id}|${s.completed_at}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }

  const journeys = [];
  for (const hops of buckets.values()) {
    const dirKey = String(hops[0].direction_id);
    const idx = stopIndexByDir[dirKey] || {};
    const sorted = [...hops].sort((a, b) => {
      const ai = idx[a.from_stop_id];
      const bi = idx[b.from_stop_id];
      if (ai != null && bi != null && ai !== bi) return ai - bi;
      // Fall back to id ordering if stop indices are missing or equal.
      return (a.id || 0) - (b.id || 0);
    });

    // Split if hops aren't actually contiguous after sorting (defensive
    // fallback for duplicate-timestamp edge cases).
    let run = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = run[run.length - 1];
      const cur = sorted[i];
      if (cur.from_stop_id === prev.to_stop_id) {
        run.push(cur);
      } else {
        journeys.push(makeJourney(run));
        run = [cur];
      }
    }
    journeys.push(makeJourney(run));
  }

  // Newest trip first.
  journeys.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  return journeys;
}

export function makeJourney(segs) {
  const first = segs[0];
  const last = segs[segs.length - 1];
  // Duration is recorded only on the first row of a logged run, but if
  // the user later edits a hop in the middle we still want to surface
  // any non-null value here.
  const durationSeg = segs.find((s) => s.duration_ms != null);
  const startedAt = first.completed_at;
  const startedDate = new Date(startedAt);
  const sameYear = startedDate.getFullYear() === new Date().getFullYear();
  return {
    key: `${first.direction_id}-${first.from_stop_id}-${last.to_stop_id}-${startedAt}`,
    directionId: first.direction_id,
    directionName: first.direction_name || first.direction_id,
    boardStop: first.from_stop_name || first.from_stop_id,
    alightStop: last.to_stop_name || last.to_stop_id,
    stopCount: segs.length + 1,
    startedAt,
    date: startedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric",
    }),
    time: startedDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    notes: segs.find((s) => s.notes)?.notes || "",
    durationMs: durationSeg ? durationSeg.duration_ms : null,
    durationSegmentId: durationSeg ? durationSeg.id : first.id,
    segments: segs,
  };
}
