# API Endpoints

> 57 nodes · cohesion 0.13

## Key Concepts

- **RouteDirection** (36 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **UserSegment** (33 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **Route** (32 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **Stop** (31 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **User** (31 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **DataLoad** (22 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **RouteStop** (20 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **List routes with total possible segment counts (cached client-side).** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Remove same-name + co-located duplicate stops from a direction list.      Preser** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Return ``{(route_id, direction_id): deduped_stop_ids}`` for the given     route** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Return ``{(route_id, direction_id): {(from_stop_id, to_stop_id), ...}}``     for** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Top users by total segments. Supports period filter and pagination.      Query p** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Public, read-only view of another explorer's progress.      Returns the same sha** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Liveness probe + DB connectivity + per-agency data-load status.** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Rich stats payload: totals, achievements, top routes, 14d sparkline, rank.** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Recent rides, one entry per logged trip.      A "trip" is the set of hops create** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Per-route completion summary. Constant-query: O(1) DB calls regardless of N.** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Mark a contiguous run of segments as completed.      Returns: { created, skipped** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Edit (or clear) the measured trip duration on a single segment row.      Pass `d** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Bulk-delete by id list, or wipe a whole route (with confirm flag).** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **``{route_id: total_possible_segments}`` using the same dedupe rules     as ``get** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Aggregate stats for a user — used by /me, /me/stats, achievement diffing.** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **Achievements that flipped locked→unlocked between two summary snapshots.** (8 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- **models.py** (7 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- **Refresh transit data for the requested agencies (TTL gated).** (7 connections) — `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/data_loader.py`
- *... and 32 more nodes in this community*

## Relationships

- No strong cross-community connections detected

## Source Files

- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/cli.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/data_loader.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/routes/api.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/tests/conftest.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/tests/test_progress_grouping.py`
- `/mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/tests/test_route_dedupe.py`

## Audit Trail

- EXTRACTED: 118 (25%)
- INFERRED: 346 (75%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [[index]] to navigate.*