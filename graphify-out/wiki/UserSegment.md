# UserSegment

> God node · 33 connections · `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`

## Connections by Relation

### calls
- [[mark_segments()]] `INFERRED`
- [[_seed_one_shuffled_trip()]] `INFERRED`
- [[test_activity_groups_one_entry_per_trip()]] `INFERRED`
- [[test_activity_separates_distinct_timestamps()]] `INFERRED`

### contains
- [[models.py]] `EXTRACTED`
- [[models.py]] `EXTRACTED`

### method
- [[.to_dict()]] `EXTRACTED`

### uses
- [[Liveness probe + DB connectivity + per-agency data-load status.]] `INFERRED`
- [[List routes with total possible segment counts (cached client-side).]] `INFERRED`
- [[Remove same-name + co-located duplicate stops from a direction list.      Preser]] `INFERRED`
- [[Return ``{(route_id, direction_id): deduped_stop_ids}`` for the given     route]] `INFERRED`
- [[Return ``{(route_id, direction_id): {(from_stop_id, to_stop_id), ...}}``     for]] `INFERRED`
- [[Top users by total segments. Supports period filter and pagination.      Query p]] `INFERRED`
- [[Public, read-only view of another explorer's progress.      Returns the same sha]] `INFERRED`
- [[Rich stats payload: totals, achievements, top routes, 14d sparkline, rank.]] `INFERRED`
- [[Recent rides, one entry per logged trip.      A "trip" is the set of hops create]] `INFERRED`
- [[Per-route completion summary. Constant-query: O(1) DB calls regardless of N.]] `INFERRED`
- [[Mark a contiguous run of segments as completed.      Returns: { created, skipped]] `INFERRED`
- [[Edit (or clear) the measured trip duration on a single segment row.      Pass `d]] `INFERRED`
- [[Bulk-delete by id list, or wipe a whole route (with confirm flag).]] `INFERRED`
- [[``{route_id: total_possible_segments}`` using the same dedupe rules     as ``get]] `INFERRED`
- [[Aggregate stats for a user — used by /me, /me/stats, achievement diffing.]] `INFERRED`
- [[Achievements that flipped locked→unlocked between two summary snapshots.]] `INFERRED`
- [[Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap]] `INFERRED`
- [[Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These]] `INFERRED`
- [[Refresh transit routes/stops/directions from OneBusAway.]] `INFERRED`
- [[Print the per-agency DataLoad state as JSON.]] `INFERRED`

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*