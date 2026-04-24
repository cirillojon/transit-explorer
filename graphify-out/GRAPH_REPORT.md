# Graph Report - transit-explorer  (2026-04-24)

## Corpus Check
- 74 files · ~115,234 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 445 nodes · 940 edges · 25 communities detected
- Extraction: 47% EXTRACTED · 53% INFERRED · 0% AMBIGUOUS · INFERRED: 501 edges (avg confidence: 0.57)
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
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `RouteDirection` - 72 edges
2. `Route` - 68 edges
3. `User` - 67 edges
4. `Stop` - 67 edges
5. `UserSegment` - 67 edges
6. `DataLoad` - 51 edges
7. `RouteStop` - 49 edges
8. `React` - 39 edges
9. `Flask` - 14 edges
10. `mark_segments()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Flask` --semantically_similar_to--> `Docker`  [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `User` --uses--> `Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Seed a single 2-hop trip (stops[0] -> stops[2]) where the rows are     inserted`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Even when rows were inserted in shuffled order, /me/progress     should return`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Two POST-shaped trips at distinct timestamps should produce two     activity en`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py

## Hyperedges (group relationships)
- **Frontend Technology Stack** — react, vite, vercel [EXTRACTED 0.95]
- **Backend Technology Stack** — flask, sqlalchemy, gunicorn, sqlite, flyio [EXTRACTED 0.95]
- **Authentication System** — firebase_auth, google_signin, react [EXTRACTED 0.90]
- **Data Loading and Storage Pipeline** — onebusaway_api, flask, sqlalchemy, sqlite [EXTRACTED 0.90]
- **Gamification Features** — leaderboard_feature, achievements_feature, route_progress [EXTRACTED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (21): Achievements(), App(), cleanLabel(), getRouteDisplayText(), useAuth(), CARTO Tiles, ErrorBoundary, Google Sign-in (+13 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (73): List routes with total possible segment counts (cached client-side)., Bulk-delete by id list, or wipe a whole route (with confirm flag)., ``{route_id: total_possible_segments}`` using the same dedupe rules     as ``get, Aggregate stats for a user — used by /me, /me/stats, achievement diffing., Achievements that flipped locked→unlocked between two summary snapshots.      Co, List routes with total possible segment counts (cached client-side)., Remove same-name + co-located duplicate stops from a direction list.      Preser, Remove same-name + co-located duplicate stops from a direction list.      Preser (+65 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (41): add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, Achievements, Alembic, Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (36): bulk_delete_segments(), debug_directions(), _dedupe_direction_stop_ids(), _deduped_stop_ids_per_direction(), _diff_achievements(), _evaluate_achievements(), get_activity(), get_leaderboard() (+28 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (20): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, _call_with_backoff() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (14): MapLegend(), distSq(), formatDuration(), getTripStats(), nearestIndex(), normalizeDirectionId(), pointToSegmentDistSq(), readTripTimes() (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (3): Regression coverage for the Phase 3 API hardening:  - /leaderboard period vali, User A creates a segment; user B must not be able to PATCH it., test_idor_patch_other_users_segment_returns_404()

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (13): Boarding Status Notification, Ranking and Badge System, Left Navigation Sidebar, Interactive Map Display, Route Completion Progress Bars, Station Information Panel, Route Progress List, Transit Route Path Visualization (+5 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (9): Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These, Seed a single 2-hop trip (stops[0] -> stops[2]) where the rows are     inserted, Two trips at different timestamps must be two activity entries., Even when rows were inserted in shuffled order, /me/progress     should return, Two POST-shaped trips at distinct timestamps should produce two     activity en, _seed_one_shuffled_trip(), test_activity_groups_one_entry_per_trip(), test_activity_separates_distinct_timestamps() (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (4): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row()

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (5): configure_logging(), JSON-structured logging for the Flask backend.  Why JSON: Fly's log shipper (a, Inject Flask `g.request_id` / `g.firebase_uid` into every record., Idempotent root-logger setup. Safe to call multiple times.      Reads:, _RequestContextFilter

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): init_sentry(), Sentry initialization for the Flask backend.  Kept in its own module so create, Initialize Sentry if SENTRY_DSN is set. Returns True if initialized., Attach the current user to outgoing Sentry events for this scope., set_sentry_user()

### Community 14 - "Community 14"
Cohesion: 0.33
Nodes (1): Regression coverage for Phase 4 observability:  - Every response carries an X-

### Community 17 - "Community 17"
Cohesion: 0.83
Nodes (3): _seed_one_line(), test_progress_total_uses_deduped_stop_count(), test_route_segment_counts_helper_dedupes()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): User A creates a segment; user B must not be able to PATCH it.

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): Per-agency snapshot of the last OneBusAway data import.      One row per agency.

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): OBA direction_ids are typically '0' or '1' but can be agency-specific     short

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): Optional measured trip duration in milliseconds.      Accepts None / missing (

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

## Knowledge Gaps
- **48 isolated node(s):** `Static fallback config. The Flask app factory reads env vars directly,     so th`, `JSON-structured logging for the Flask backend.  Why JSON: Fly's log shipper (a`, `Inject Flask `g.request_id` / `g.firebase_uid` into every record.`, `Idempotent root-logger setup. Safe to call multiple times.      Reads:`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (6 nodes): `Regression coverage for Phase 4 observability:  - Every response carries an X-`, `test_distinct_request_ids_per_call()`, `test_response_has_request_id_header()`, `test_safe_inbound_request_id_is_echoed()`, `test_unsafe_inbound_request_id_replaced()`, `test_request_id.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `User A creates a segment; user B must not be able to PATCH it.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `OBA direction_ids are typically '0' or '1' but can be agency-specific     short`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `Optional measured trip duration in milliseconds.      Accepts None / missing (`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React` connect `Community 0` to `Community 2`, `Community 5`?**
  _High betweenness centrality (0.247) - this node is a cross-community bridge._
- **Why does `Flask` connect `Community 2` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.182) - this node is a cross-community bridge._
- **Why does `Transit Explorer` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Are the 70 inferred relationships involving `RouteDirection` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`RouteDirection` has 70 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `Route` (e.g. with `Inspect ``httpx.HTTPStatusError`` / ``requests.HTTPError`` for     retryable sta` and `Refresh transit data for the requested agencies (TTL gated).`) actually correct?**
  _`Route` has 65 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 65 INFERRED edges - model-reasoned connections that need verification._
- **Are the 65 inferred relationships involving `Stop` (e.g. with `Inspect ``httpx.HTTPStatusError`` / ``requests.HTTPError`` for     retryable sta` and `Refresh transit data for the requested agencies (TTL gated).`) actually correct?**
  _`Stop` has 65 INFERRED edges - model-reasoned connections that need verification._