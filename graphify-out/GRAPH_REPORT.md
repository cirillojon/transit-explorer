# Graph Report - transit-explorer  (2026-05-11)

## Corpus Check
- 77 files · ~123,715 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 497 nodes · 1112 edges · 34 communities detected
- Extraction: 43% EXTRACTED · 57% INFERRED · 0% AMBIGUOUS · INFERRED: 636 edges (avg confidence: 0.55)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]

## God Nodes (most connected - your core abstractions)
1. `RouteDirection` - 94 edges
2. `Route` - 90 edges
3. `User` - 89 edges
4. `Stop` - 89 edges
5. `UserSegment` - 89 edges
6. `DataLoad` - 63 edges
7. `RouteStop` - 61 edges
8. `React` - 40 edges
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
Cohesion: 0.02
Nodes (26): Achievements(), App(), cleanLabel(), getRouteDisplayText(), useAuth(), CARTO Tiles, ErrorBoundary, Google Sign-in (+18 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (87): Atomic partial update for a single segment row.      Body fields are optional —, List routes with total possible segment counts (cached client-side)., Bulk-delete by id list, or wipe a whole route (with confirm flag)., Legacy notes-only update. Prefer PATCH /me/segments/<id> for     new clients — r, Edit (or clear) the measured trip duration on a single segment row.      Pass `d, ``{route_id: total_possible_segments}`` using the same dedupe rules     as ``get, Aggregate stats for a user — used by /me, /me/stats, achievement diffing., Bulk-delete by id list, or wipe a whole route (with confirm flag). (+79 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (45): add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, Achievements, Alembic, Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (39): bulk_delete_segments(), debug_directions(), _dedupe_direction_stop_ids(), _deduped_stop_ids_per_direction(), _diff_achievements(), _evaluate_achievements(), get_activity(), get_leaderboard() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.14
Nodes (20): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, _call_with_backoff() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (13): _seed_two_routes(), test_patch_me_settings_clears_display_name(), test_patch_me_settings_display_name_returned_in_get_me(), test_patch_me_settings_rejects_non_bool(), test_patch_me_settings_rejects_non_string_display_name(), test_patch_me_settings_rejects_too_long_display_name(), test_patch_me_settings_requires_auth(), test_patch_me_settings_sets_display_name() (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.23
Nodes (11): distSq(), getTripStats(), nearestIndex(), normalizeDirectionId(), pointToSegmentDistSq(), readTripTimes(), recordTripTime(), sliceOneStopPair() (+3 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (3): Regression coverage for the Phase 3 API hardening:  - /leaderboard period vali, User A creates a segment; user B must not be able to PATCH it., test_idor_patch_other_users_segment_returns_404()

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (13): Boarding Status Notification, Ranking and Badge System, Left Navigation Sidebar, Interactive Map Display, Route Completion Progress Bars, Station Information Panel, Route Progress List, Transit Route Path Visualization (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (9): Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These, Seed a single 2-hop trip (stops[0] -> stops[2]) where the rows are     inserted, Two trips at different timestamps must be two activity entries., Even when rows were inserted in shuffled order, /me/progress     should return, Two POST-shaped trips at distinct timestamps should produce two     activity en, _seed_one_shuffled_trip(), test_activity_groups_one_entry_per_trip(), test_activity_separates_distinct_timestamps() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (4): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row()

### Community 12 - "Community 12"
Cohesion: 0.29
Nodes (3): auth_headers(), Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create, Return headers with a fake bearer token; patch Firebase verification     so any

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (5): configure_logging(), JSON-structured logging for the Flask backend.  Why JSON: Fly's log shipper (a, Inject Flask `g.request_id` / `g.firebase_uid` into every record., Idempotent root-logger setup. Safe to call multiple times.      Reads:, _RequestContextFilter

### Community 14 - "Community 14"
Cohesion: 0.4
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (1): Regression coverage for Phase 4 observability:  - Every response carries an X-

### Community 18 - "Community 18"
Cohesion: 0.6
Nodes (4): Regression test: /me/progress totals must match the deduped hops the frontend a, _seed_one_line(), test_progress_total_uses_deduped_stop_count(), test_route_segment_counts_helper_dedupes()

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): Regression tests for the duplicate-stop dedupe in GET /api/routes/<id>.  Backg, _seed_route_with_trailing_dup(), test_get_route_dedupes_trailing_duplicate_platform()

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): Fetch all routes for a given agency.

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Per-agency snapshot of the last OneBusAway data import.      One row per agency.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): OBA direction_ids are typically '0' or '1' but can be agency-specific     short

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Optional measured trip duration in milliseconds.      Accepts None / missing (

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Validate a list of positive integer IDs (e.g. for bulk delete).      Always ca

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Optional ISO-8601 timestamp for backdating segment completion.      Returns a

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): User A creates a segment; user B must not be able to PATCH it.

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Per-agency snapshot of the last OneBusAway data import.      One row per agency.

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): OBA direction_ids are typically '0' or '1' but can be agency-specific     short

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (1): Optional measured trip duration in milliseconds.      Accepts None / missing (

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

## Knowledge Gaps
- **57 isolated node(s):** `Static fallback config. The Flask app factory reads env vars directly,     so th`, `JSON-structured logging for the Flask backend.  Why JSON: Fly's log shipper (a`, `Inject Flask `g.request_id` / `g.firebase_uid` into every record.`, `Idempotent root-logger setup. Safe to call multiple times.      Reads:`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (6 nodes): `Regression coverage for Phase 4 observability:  - Every response carries an X-`, `test_distinct_request_ids_per_call()`, `test_response_has_request_id_header()`, `test_safe_inbound_request_id_is_echoed()`, `test_unsafe_inbound_request_id_replaced()`, `test_request_id.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (3 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `Fetch all routes for a given agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `OBA direction_ids are typically '0' or '1' but can be agency-specific     short`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Optional measured trip duration in milliseconds.      Accepts None / missing (`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Validate a list of positive integer IDs (e.g. for bulk delete).      Always ca`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Optional ISO-8601 timestamp for backdating segment completion.      Returns a`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `User A creates a segment; user B must not be able to PATCH it.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `OBA direction_ids are typically '0' or '1' but can be agency-specific     short`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `Optional measured trip duration in milliseconds.      Accepts None / missing (`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Why does `Flask` connect `Community 2` to `Community 3`, `Community 4`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `Transit Explorer` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Are the 92 inferred relationships involving `RouteDirection` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`RouteDirection` has 92 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `Route` (e.g. with `Inspect ``httpx.HTTPStatusError`` / ``requests.HTTPError`` for     retryable sta` and `Refresh transit data for the requested agencies (TTL gated).`) actually correct?**
  _`Route` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 87 INFERRED edges - model-reasoned connections that need verification._
- **Are the 87 inferred relationships involving `Stop` (e.g. with `Inspect ``httpx.HTTPStatusError`` / ``requests.HTTPError`` for     retryable sta` and `Refresh transit data for the requested agencies (TTL gated).`) actually correct?**
  _`Stop` has 87 INFERRED edges - model-reasoned connections that need verification._