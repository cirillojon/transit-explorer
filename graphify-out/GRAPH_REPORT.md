# Graph Report - transit-explorer  (2026-04-23)

## Corpus Check
- 59 files · ~90,320 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 359 nodes · 702 edges · 29 communities detected
- Extraction: 48% EXTRACTED · 52% INFERRED · 0% AMBIGUOUS · INFERRED: 367 edges (avg confidence: 0.55)
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
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]

## God Nodes (most connected - your core abstractions)
1. `User` - 55 edges
2. `Route` - 52 edges
3. `UserSegment` - 52 edges
4. `Stop` - 51 edges
5. `RouteDirection` - 51 edges
6. `DataLoad` - 44 edges
7. `RouteStop` - 42 edges
8. `React Framework` - 25 edges
9. `mark_segments()` - 10 edges
10. `Liveness probe + DB connectivity + per-agency data-load status.` - 8 edges

## Surprising Connections (you probably didn't know these)
- `User` --uses--> `Two POST-shaped trips at distinct timestamps should produce two     activity en`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `User` --uses--> `Two trips at different timestamps must be two activity entries.`  [INFERRED]
  app/models.py → tests/test_progress_grouping.py
- `Route` --uses--> `Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create`  [INFERRED]
  app/models.py → tests/conftest.py
- `Route` --uses--> `Return headers with a fake bearer token; patch Firebase verification     so any`  [INFERRED]
  app/models.py → tests/conftest.py
- `Stop` --uses--> `Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create`  [INFERRED]
  app/models.py → tests/conftest.py

## Hyperedges (group relationships)
- **Automated Deployment Pipeline** — github_actions, fly_io, vercel [EXTRACTED 1.00]
- **Flask Backend Runtime Stack** — flask, sqlalchemy, gunicorn [EXTRACTED 1.00]
- **React Frontend Stack** — react, vite, leaflet [EXTRACTED 1.00]
- **Authentication Flow** — firebase_auth, google_sign_in, react_frontend [EXTRACTED 1.00]
- **Data Ingestion & Storage Pipeline** — data_loader, onebusaway_api, sqlite [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (66): get_activity(), get_leaderboard(), get_routes(), List routes with total possible segment counts (cached client-side)., Top users by total segments. Supports period filter and pagination.      Query p, Remove same-name + co-located duplicate stops from a direction list.      Preser, Public, read-only view of another explorer's progress.      Returns the same sha, Top users by total segments. Supports period filter and pagination.      Query p (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (13): App(), cleanLabel(), getRouteDisplayText(), useAuth(), ErrorBoundary, Leaflet Map Library, MapLegend(), formatDuration() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (27): bulk_delete_segments(), debug_directions(), _dedupe_direction_stop_ids(), _diff_achievements(), _evaluate_achievements(), get_me(), get_progress(), get_route() (+19 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (20): Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), app(), auth_headers(), Pytest fixtures for transit-explorer backend smoke tests.  Strategy: - create, Return headers with a fake bearer token; patch Firebase verification     so any (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (21): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, register_cli() (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 6 - "Community 6"
Cohesion: 0.12
Nodes (5): add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create, add route_directions.encoded_polylines_json  Revision ID: c7e4a2d18b55 Revise, baseline schema  Revision ID: f838d5f10e83 Revises:  Create Date: 2026-04-21 14:, SQLAlchemy ORM

### Community 7 - "Community 7"
Cohesion: 0.24
Nodes (9): distSq(), getTripStats(), nearestIndex(), pointToSegmentDistSq(), readTripTimes(), recordTripTime(), sliceOneStopPair(), slicePolylineByStops() (+1 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (4): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row()

### Community 9 - "Community 9"
Cohesion: 0.33
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (7): Achievements & Badges, Gamification, Leaderboard System, Mobile-First UX, Route Tracking, Segment Logging, Transit Explorer

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (7): Interactive Map View (UI), Progress Tracking (UI), Route Segment (UI), Transit Routes List (UI), Seattle Map Geography, Transit Stop (UI), Transit Explorer App (UI)

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): Fly.io (Backend Hosting), GitHub Actions (CI/CD), Single Machine Deployment Rationale, Vercel (Frontend Hosting)

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): Firebase Auth, Firebase Keys Not Secrets Rationale, Google Sign-In

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (1): Vite Bundler

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): SQLite Database, SQLite for Single-Instance Rationale

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): Frontend Favicon, React Logo (asset)

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): Per-agency snapshot of the last OneBusAway data import.      One row per agency.

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): Initialize Firebase Admin SDK for token verification.

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): PostgreSQL Database

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): Gunicorn WSGI Server

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): OneBusAway API

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): CARTO Basemap Tiles

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): In-Process Loader Design Rationale

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Leaderboard Ranking (UI)

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (1): Vite (logo)

## Knowledge Gaps
- **44 isolated node(s):** `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap`, `Refresh transit routes/stops/directions from OneBusAway.`, `Print the per-agency DataLoad state as JSON.`, `Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s`, `Static fallback config. The Flask app factory reads env vars directly,     so th` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 9`** (7 nodes): `groupIntoJourneys()`, `makeJourney()`, `PPAchievements()`, `PPOverview()`, `PPRoutes()`, `PublicProfile()`, `PublicProfile.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (3 nodes): `groupIntoJourneys()`, `makeJourney()`, `journeyGrouping.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `vite.config.js`, `Vite Bundler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `SQLite Database`, `SQLite for Single-Instance Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `Frontend Favicon`, `React Logo (asset)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Per-agency snapshot of the last OneBusAway data import.      One row per agency.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `Initialize Firebase Admin SDK for token verification.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `PostgreSQL Database`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `Gunicorn WSGI Server`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `OneBusAway API`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `CARTO Basemap Tiles`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `In-Process Loader Design Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Leaderboard Ranking (UI)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `Vite (logo)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React Framework` connect `Community 1` to `Community 9`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `UserSegment` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `mark_segments()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 53 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 53 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 49 INFERRED edges - model-reasoned connections that need verification._
- **Are the 50 inferred relationships involving `UserSegment` (e.g. with `Liveness probe + DB connectivity + per-agency data-load status.` and `List routes with total possible segment counts (cached client-side).`) actually correct?**
  _`UserSegment` has 50 INFERRED edges - model-reasoned connections that need verification._
- **Are the 49 inferred relationships involving `Stop` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Stop` has 49 INFERRED edges - model-reasoned connections that need verification._