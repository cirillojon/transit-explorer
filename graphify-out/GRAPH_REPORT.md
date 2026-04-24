# Graph Report - .  (2026-04-23)

## Corpus Check
- 84 files · ~98,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 417 nodes · 856 edges · 24 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 234 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_React UI Components|React UI Components]]
- [[_COMMUNITY_API Endpoints|API Endpoints]]
- [[_COMMUNITY_Backend Service Functions|Backend Service Functions]]
- [[_COMMUNITY_Authentication Module|Authentication Module]]
- [[_COMMUNITY_Database Migrations|Database Migrations]]
- [[_COMMUNITY_Frontend API Client|Frontend API Client]]
- [[_COMMUNITY_Map Geometry Utilities|Map Geometry Utilities]]
- [[_COMMUNITY_Test Fixtures|Test Fixtures]]
- [[_COMMUNITY_Transit Data Loader|Transit Data Loader]]
- [[_COMMUNITY_UI Hero Screenshot|UI Hero Screenshot]]
- [[_COMMUNITY_Segment Marking Tests|Segment Marking Tests]]
- [[_COMMUNITY_App Entry & Auth Context|App Entry & Auth Context]]
- [[_COMMUNITY_OneBusAway Service Client|OneBusAway Service Client]]
- [[_COMMUNITY_Auth Endpoint Tests|Auth Endpoint Tests]]
- [[_COMMUNITY_Leaderboard Tests|Leaderboard Tests]]
- [[_COMMUNITY_Progress Dedupe Tests|Progress Dedupe Tests]]
- [[_COMMUNITY_Public Profile View|Public Profile View]]
- [[_COMMUNITY_Route List Component|Route List Component]]
- [[_COMMUNITY_User Progress Component|User Progress Component]]
- [[_COMMUNITY_Config Module|Config Module]]
- [[_COMMUNITY_Journey Grouping Logic|Journey Grouping Logic]]
- [[_COMMUNITY_Health Check Tests|Health Check Tests]]
- [[_COMMUNITY_API Client Tests|API Client Tests]]
- [[_COMMUNITY_Journey Grouping Tests|Journey Grouping Tests]]

## God Nodes (most connected - your core abstractions)
1. `React` - 70 edges
2. `RouteDirection` - 36 edges
3. `UserSegment` - 33 edges
4. `Route` - 32 edges
5. `User` - 31 edges
6. `Stop` - 31 edges
7. `DataLoad` - 22 edges
8. `RouteStop` - 20 edges
9. `Flask` - 19 edges
10. `SQLAlchemy` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Flask` --semantically_similar_to--> `Docker`  [INFERRED] [semantically similar]
  README.md → CONTRIBUTING.md
- `SQLite` --rationale_for--> `Transit Explorer`  [INFERRED]
  docs/ARCHITECTURE.md → README.md
- `SQLAlchemy` --references--> `PostgreSQL`  [INFERRED]
  README.md → docs/ARCHITECTURE.md
- `Verify a Firebase ID token and return the decoded claims.` --uses--> `User`  [INFERRED]
  /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/auth.py → /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py
- `Decorator that requires a valid Firebase auth token.      Sets g.current_user to` --uses--> `User`  [INFERRED]
  /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/auth.py → /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py

## Hyperedges (group relationships)
- **Frontend Technology Stack** — react, vite, vercel [EXTRACTED 0.95]
- **Backend Technology Stack** — flask, sqlalchemy, gunicorn, sqlite, flyio [EXTRACTED 0.95]
- **Authentication System** — firebase_auth, google_signin, react [EXTRACTED 0.90]
- **Data Loading and Storage Pipeline** — onebusaway_api, flask, sqlalchemy, sqlite [EXTRACTED 0.90]
- **Gamification Features** — leaderboard_feature, achievements_feature, route_progress [EXTRACTED 0.85]

## Communities

### Community 0 - "React UI Components"
Cohesion: 0.03
Nodes (33): Achievements(), AllRoutesBanner(), AllRouteSegmentsLayer(), CARTO Tiles, ConfirmDialog(), DirectionTabs(), ErrorBoundary, Boom() (+25 more)

### Community 1 - "API Endpoints"
Cohesion: 0.13
Nodes (46): List routes with total possible segment counts (cached client-side)., Remove same-name + co-located duplicate stops from a direction list.      Preser, Return ``{(route_id, direction_id): deduped_stop_ids}`` for the given     route, Return ``{(route_id, direction_id): {(from_stop_id, to_stop_id), ...}}``     for, Top users by total segments. Supports period filter and pagination.      Query p, Public, read-only view of another explorer's progress.      Returns the same sha, Liveness probe + DB connectivity + per-agency data-load status., Rich stats payload: totals, achievements, top routes, 14d sparkline, rank. (+38 more)

### Community 2 - "Backend Service Functions"
Cohesion: 0.15
Nodes (31): bulk_delete_segments(), debug_directions(), _dedupe_direction_stop_ids(), _deduped_stop_ids_per_direction(), delete_segment(), _diff_achievements(), _evaluate_achievements(), get_activity() (+23 more)

### Community 3 - "Authentication Module"
Cohesion: 0.08
Nodes (29): Achievements, Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), data_check_schema(), data_load(), data_status() (+21 more)

### Community 4 - "Database Migrations"
Cohesion: 0.15
Nodes (16): downgrade(), add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, upgrade(), Alembic, downgrade(), add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create, upgrade(), downgrade() (+8 more)

### Community 5 - "Frontend API Client"
Cohesion: 0.21
Nodes (18): bulkDeleteSegments(), cached(), deleteSegment(), fetchActivity(), fetchHealth(), fetchLeaderboard(), fetchMe(), fetchProgress() (+10 more)

### Community 6 - "Map Geometry Utilities"
Cohesion: 0.23
Nodes (15): decode(), distSq(), formatDuration(), getStopPickStatus(), getTripStats(), nearestIndex(), normalizeDirectionId(), pointToSegmentDistSq() (+7 more)

### Community 7 - "Test Fixtures"
Cohesion: 0.22
Nodes (11): app(), auth_headers(), client(), _env(), fake_uid(), Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create, Flask-Migrate, create_app() (+3 more)

### Community 8 - "Transit Data Loader"
Cohesion: 0.36
Nodes (12): _call_with_backoff(), create_user(), _get_or_create_state(), load_transit_data(), _process_route_stops(), _refresh_agency(), status(), _upsert_direction() (+4 more)

### Community 9 - "UI Hero Screenshot"
Cohesion: 0.18
Nodes (13): Boarding Status Notification, Ranking and Badge System, Left Navigation Sidebar, Interactive Map Display, Route Completion Progress Bars, Station Information Panel, Route Progress List, Transit Route Path Visualization (+5 more)

### Community 10 - "Segment Marking Tests"
Cohesion: 0.29
Nodes (9): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row(), test_mark_segments_rejects_missing_stop(), test_mark_segments_rejects_oversize_notes(), test_mark_segments_validates_id_format(), test_mark_segments_validates_required_fields() (+1 more)

### Community 11 - "App Entry & Auth Context"
Cohesion: 0.36
Nodes (5): App(), cleanLabel(), getRouteDisplayText(), AuthProvider(), useAuth()

### Community 12 - "OneBusAway Service Client"
Cohesion: 0.43
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 13 - "Auth Endpoint Tests"
Cohesion: 0.53
Nodes (4): test_invalid_token_claims_rejected(), test_me_accepts_mocked_token(), test_me_rejects_malformed_header(), test_me_requires_auth()

### Community 14 - "Leaderboard Tests"
Cohesion: 0.53
Nodes (4): test_debug_directions_blocked_in_production(), test_leaderboard_empty(), test_leaderboard_includes_user_after_marking(), test_leaderboard_invalid_pagination()

### Community 15 - "Progress Dedupe Tests"
Cohesion: 0.67
Nodes (4): Regression test: /me/progress totals must match the deduped hops the frontend a, _seed_one_line(), test_progress_total_uses_deduped_stop_count(), test_route_segment_counts_helper_dedupes()

### Community 16 - "Public Profile View"
Cohesion: 0.53
Nodes (4): PPAchievements(), PPOverview(), PPRoutes(), PublicProfile()

### Community 17 - "Route List Component"
Cohesion: 0.7
Nodes (3): cleanLabel(), getRouteDisplayText(), RouteList()

### Community 18 - "User Progress Component"
Cohesion: 0.6
Nodes (3): formatDurationMs(), parseDurationInput(), UserProgress()

### Community 19 - "Config Module"
Cohesion: 0.5
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 20 - "Journey Grouping Logic"
Cohesion: 0.83
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 21 - "Health Check Tests"
Cohesion: 0.67
Nodes (1): test_health_ok()

### Community 22 - "API Client Tests"
Cohesion: 0.67
Nodes (1): currentUser()

### Community 23 - "Journey Grouping Tests"
Cohesion: 0.67
Nodes (1): hop()

## Knowledge Gaps
- **23 isolated node(s):** `Static fallback config. The Flask app factory reads env vars directly,     so th`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`, `Fetch all routes for a given agency.`, `Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP`, `OBA direction_ids are typically '0' or '1' but can be agency-specific     short` (+18 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Config Module`** (4 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`, `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Journey Grouping Logic`** (4 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Check Tests`** (3 nodes): `test_health.py`, `test_health_ok()`, `test_health.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `API Client Tests`** (3 nodes): `currentUser()`, `api.test.js`, `api.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Journey Grouping Tests`** (3 nodes): `hop()`, `journeyGrouping.test.js`, `journeyGrouping.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React` connect `React UI Components` to `Authentication Module`, `Map Geometry Utilities`, `App Entry & Auth Context`, `Public Profile View`, `Route List Component`, `User Progress Component`?**
  _High betweenness centrality (0.389) - this node is a cross-community bridge._
- **Why does `Flask` connect `Authentication Module` to `Backend Service Functions`, `Database Migrations`, `Test Fixtures`?**
  _High betweenness centrality (0.316) - this node is a cross-community bridge._
- **Why does `Transit Explorer` connect `Authentication Module` to `React UI Components`, `Database Migrations`?**
  _High betweenness centrality (0.304) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `React` (e.g. with `Vite` and `Vercel`) actually correct?**
  _`React` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 33 inferred relationships involving `RouteDirection` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`RouteDirection` has 33 INFERRED edges - model-reasoned connections that need verification._
- **Are the 30 inferred relationships involving `UserSegment` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`UserSegment` has 30 INFERRED edges - model-reasoned connections that need verification._
- **Are the 28 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 28 INFERRED edges - model-reasoned connections that need verification._