# Graph Report - transit-explorer (2026-04-24)

## Corpus Check

- 70 files · ~100,660 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary

- 382 nodes · 733 edges · 16 communities detected
- Extraction: 55% EXTRACTED · 45% INFERRED · 0% AMBIGUOUS · INFERRED: 333 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)

- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 27|Community 27]]

## God Nodes (most connected - your core abstractions)

1. `RouteDirection` - 51 edges
2. `UserSegment` - 48 edges
3. `Route` - 47 edges
4. `User` - 46 edges
5. `Stop` - 46 edges
6. `React` - 39 edges
7. `DataLoad` - 30 edges
8. `RouteStop` - 28 edges
9. `Flask` - 14 edges
10. `Transit Explorer` - 12 edges

## Surprising Connections (you probably didn't know these)

- `Flask` --semantically_similar_to--> `Docker` [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `Route` --calls--> `_seed_one_line()` [INFERRED]
  app/models.py → tests/test_progress_dedupe.py
- `Stop` --calls--> `_seed_one_line()` [INFERRED]
  app/models.py → tests/test_progress_dedupe.py
- `RouteDirection` --calls--> `_seed_one_line()` [INFERRED]
  app/models.py → tests/test_progress_dedupe.py
- `create_app()` --calls--> `app()` [INFERRED]
  app/**init**.py → tests/conftest.py

## Hyperedges (group relationships)

- **Frontend Technology Stack** — react, vite, vercel [EXTRACTED 0.95]
- **Backend Technology Stack** — flask, sqlalchemy, gunicorn, sqlite, flyio [EXTRACTED 0.95]
- **Authentication System** — firebase_auth, google_signin, react [EXTRACTED 0.90]
- **Data Loading and Storage Pipeline** — onebusaway_api, flask, sqlalchemy, sqlite [EXTRACTED 0.90]
- **Gamification Features** — leaderboard_feature, achievements_feature, route_progress [EXTRACTED 0.85]

## Communities

### Community 0 - "Community 0"

Cohesion: 0.03
Nodes (15): CARTO Tiles, ErrorBoundary, Google Sign-in, React, cleanLabel(), getRouteDisplayText(), TransitMap(), useAllRoutesView() (+7 more)

### Community 1 - "Community 1"

Cohesion: 0.12
Nodes (62): List routes with total possible segment counts (cached client-side)., Remove same-name + co-located duplicate stops from a direction list. Preser, Return `{(route_id, direction_id): deduped_stop_ids}` for the given route, Return `{(route_id, direction_id): {(from_stop_id, to_stop_id), ...}}` for, Top users by total segments. Supports period filter and pagination. Query p, Public, read-only view of another explorer's progress. Returns the same sha, Liveness probe + DB connectivity + per-agency data-load status., Rich stats payload: totals, achievements, top routes, 14d sparkline, rank. (+54 more)

### Community 2 - "Community 2"

Cohesion: 0.05
Nodes (32): add user_segments.duration_ms Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, Achievements, Alembic, Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token. Sets g.current_user to, require_auth(), verify_firebase_token(), add data_loads table Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create (+24 more)

### Community 3 - "Community 3"

Cohesion: 0.11
Nodes (32): bulk_delete_segments(), debug_directions(), \_dedupe_direction_stop_ids(), \_deduped_stop_ids_per_direction(), \_diff_achievements(), \_evaluate_achievements(), get_activity(), get_leaderboard() (+24 more)

### Community 4 - "Community 4"

Cohesion: 0.14
Nodes (19): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer. Registered in app/**init**.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head. Used by `bin/check-s, \_call_with_backoff() (+11 more)

### Community 5 - "Community 5"

Cohesion: 0.15
Nodes (14): MapLegend(), distSq(), formatDuration(), getTripStats(), nearestIndex(), normalizeDirectionId(), pointToSegmentDistSq(), readTripTimes() (+6 more)

### Community 6 - "Community 6"

Cohesion: 0.12
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 7 - "Community 7"

Cohesion: 0.12
Nodes (12): register_cli(), app(), auth_headers(), create_app(), \_init_firebase(), Flask app factory for Transit Explorer. Boot model (kept deliberately simple), Initialize Firebase Admin SDK for token verification., init_sentry() (+4 more)

### Community 8 - "Community 8"

Cohesion: 0.18
Nodes (13): Boarding Status Notification, Ranking and Badge System, Left Navigation Sidebar, Interactive Map Display, Route Completion Progress Bars, Station Information Panel, Route Progress List, Transit Route Path Visualization (+5 more)

### Community 9 - "Community 9"

Cohesion: 0.2
Nodes (4): If pair_keys[0] was already marked, duration_ms must still land on the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row()

### Community 10 - "Community 10"

Cohesion: 0.38
Nodes (4): App(), cleanLabel(), getRouteDisplayText(), useAuth()

### Community 11 - "Community 11"

Cohesion: 0.4
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route. Uses raw HTTP

### Community 14 - "Community 14"

Cohesion: 0.83
Nodes (3): \_seed_one_line(), test_progress_total_uses_deduped_stop_count(), test_route_segment_counts_helper_dedupes()

### Community 15 - "Community 15"

Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly, so th

### Community 16 - "Community 16"

Cohesion: 1.0
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 27 - "Community 27"

Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

## Knowledge Gaps

- **33 isolated node(s):** `Static fallback config. The Flask app factory reads env vars directly,     so th`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`, `Fetch all routes for a given agency.`, `Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP`, `Sentry initialization for the Flask backend.  Kept in its own module so create` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `React` connect `Community 0` to `Community 10`, `Community 2`, `Community 5`?**
  _High betweenness centrality (0.360) - this node is a cross-community bridge._
- **Why does `Flask` connect `Community 2` to `Community 3`, `Community 4`, `Community 7`?**
  _High betweenness centrality (0.328) - this node is a cross-community bridge._
- **Why does `Transit Explorer` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.306) - this node is a cross-community bridge._
- **Are the 49 inferred relationships involving `RouteDirection` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`RouteDirection` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 46 inferred relationships involving `UserSegment` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`UserSegment` has 46 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 44 INFERRED edges - model-reasoned connections that need verification._
- **Are the 44 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 44 INFERRED edges - model-reasoned connections that need verification._
