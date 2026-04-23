# Graph Report - transit-explorer  (2026-04-23)

## Corpus Check
- 60 files · ~95,302 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 381 nodes · 831 edges · 32 communities detected
- Extraction: 43% EXTRACTED · 57% INFERRED · 0% AMBIGUOUS · INFERRED: 477 edges (avg confidence: 0.54)
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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]

## God Nodes (most connected - your core abstractions)
1. `RouteDirection` - 71 edges
2. `UserSegment` - 70 edges
3. `User` - 68 edges
4. `Route` - 67 edges
5. `Stop` - 66 edges
6. `DataLoad` - 57 edges
7. `RouteStop` - 55 edges
8. `React Framework` - 25 edges
9. `mark_segments()` - 11 edges
10. `_deduped_stop_ids_per_direction()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `User` --uses--> `Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Insert 2 trips on the seeded route, intentionally inserting hops     out of rou`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Even when rows were inserted in shuffled order, /me/progress     should return`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Two POST-shaped trips at distinct timestamps should produce two     activity en`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Two trips at different timestamps must be two activity entries.`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py

## Hyperedges (group relationships)
- **Automated Deployment Pipeline** — github_actions, fly_io, vercel [EXTRACTED 1.00]
- **Flask Backend Runtime Stack** — flask, sqlalchemy, gunicorn [EXTRACTED 1.00]
- **React Frontend Stack** — react, vite, leaflet [EXTRACTED 1.00]
- **Authentication Flow** — firebase_auth, google_sign_in, react_frontend [EXTRACTED 1.00]
- **Data Ingestion & Storage Pipeline** — data_loader, onebusaway_api, sqlite [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.15
Nodes (66): get_activity(), get_leaderboard(), List routes with total possible segment counts (cached client-side)., Top users by total segments. Supports period filter and pagination.      Query p, Remove same-name + co-located duplicate stops from a direction list.      Preser, Return ``{(route_id, direction_id): deduped_stop_ids}`` for the given     route, Public, read-only view of another explorer's progress.      Returns the same sha, Top users by total segments. Supports period filter and pagination.      Query p (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (13): App(), cleanLabel(), getRouteDisplayText(), useAuth(), ErrorBoundary, Leaflet Map Library, MapLegend(), formatDuration() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (32): bulk_delete_segments(), debug_directions(), _dedupe_direction_stop_ids(), _deduped_stop_ids_per_direction(), _diff_achievements(), _evaluate_achievements(), get_me(), get_progress() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (18): add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create, add route_directions.encoded_polylines_json  Revision ID: c7e4a2d18b55 Revise, register_cli(), app(), auth_headers(), Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create, Return headers with a fake bearer token; patch Firebase verification     so any (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (20): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, _call_with_backoff() (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 6 - "Community 6"
Cohesion: 0.24
Nodes (9): distSq(), getTripStats(), nearestIndex(), pointToSegmentDistSq(), readTripTimes(), recordTripTime(), sliceOneStopPair(), slicePolylineByStops() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (8): Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), get_engine(), get_engine_url(), run_migrations_online(), Flask Framework

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (9): Tests for the trip-grouping behaviour of /me/progress and /me/activity.  These, Insert 2 trips on the seeded route, intentionally inserting hops     out of rou, Two trips at different timestamps must be two activity entries., Even when rows were inserted in shuffled order, /me/progress     should return, Two POST-shaped trips at distinct timestamps should produce two     activity en, _seed_one_shuffled_trip(), test_activity_groups_one_entry_per_trip(), test_activity_separates_distinct_timestamps() (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (4): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row()

### Community 10 - "Community 10"
Cohesion: 0.33
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (7): Achievements & Badges, Gamification, Leaderboard System, Mobile-First UX, Route Tracking, Segment Logging, Transit Explorer

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (7): Interactive Map View (UI), Progress Tracking (UI), Route Segment (UI), Transit Routes List (UI), Seattle Map Geography, Transit Stop (UI), Transit Explorer App (UI)

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (4): Regression test: /me/progress totals must match the deduped hops the frontend a, _seed_one_line(), test_progress_total_uses_deduped_stop_count(), test_route_segment_counts_helper_dedupes()

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (3): Regression tests for the duplicate-stop dedupe in GET /api/routes/<id>.  Backg, _seed_route_with_trailing_dup(), test_get_route_dedupes_trailing_duplicate_platform()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (4): Fly.io (Backend Hosting), GitHub Actions (CI/CD), Single Machine Deployment Rationale, Vercel (Frontend Hosting)

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (3): Firebase Auth, Firebase Keys Not Secrets Rationale, Google Sign-In

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Vite Bundler

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (2): SQLite Database, SQLite for Single-Instance Rationale

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (2): Frontend Favicon, React Logo (asset)

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Per-agency snapshot of the last OneBusAway data import.      One row per agency.

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): PostgreSQL Database

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Gunicorn WSGI Server

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): OneBusAway API

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): CARTO Basemap Tiles

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (1): In-Process Loader Design Rationale

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (1): Leaderboard Ranking (UI)

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (1): Vite (logo)

## Knowledge Gaps
- **40 isolated node(s):** `Static fallback config. The Flask app factory reads env vars directly,     so th`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`, `Fetch all routes for a given agency.`, `Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP`, `Lightweight request-payload validators.  Kept dependency-free so we don't pull` (+35 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (7 nodes): `groupIntoJourneys()`, `makeJourney()`, `PPAchievements()`, `PPOverview()`, `PPRoutes()`, `PublicProfile()`, `PublicProfile.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (3 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `vite.config.js`, `Vite Bundler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `SQLite Database`, `SQLite for Single-Instance Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `Frontend Favicon`, `React Logo (asset)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `PostgreSQL Database`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Gunicorn WSGI Server`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `OneBusAway API`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `CARTO Basemap Tiles`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `In-Process Loader Design Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `Leaderboard Ranking (UI)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `Vite (logo)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UserSegment` connect `Community 0` to `Community 8`, `Community 2`, `Community 4`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `React Framework` connect `Community 1` to `Community 10`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Why does `SQLAlchemy ORM` connect `Community 3` to `Community 2`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 69 inferred relationships involving `RouteDirection` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`RouteDirection` has 69 INFERRED edges - model-reasoned connections that need verification._
- **Are the 68 inferred relationships involving `UserSegment` (e.g. with `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap` and `Refresh transit routes/stops/directions from OneBusAway.`) actually correct?**
  _`UserSegment` has 68 INFERRED edges - model-reasoned connections that need verification._
- **Are the 66 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 66 INFERRED edges - model-reasoned connections that need verification._
- **Are the 64 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 64 INFERRED edges - model-reasoned connections that need verification._