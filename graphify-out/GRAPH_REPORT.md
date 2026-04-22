# Graph Report - transit-explorer  (2026-04-22)

## Corpus Check
- 53 files · ~77,588 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 299 nodes · 454 edges · 28 communities detected
- Extraction: 66% EXTRACTED · 34% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.59)
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `React Framework` - 25 edges
2. `Route` - 22 edges
3. `Stop` - 21 edges
4. `RouteDirection` - 21 edges
5. `User` - 19 edges
6. `DataLoad` - 18 edges
7. `RouteStop` - 16 edges
8. `UserSegment` - 16 edges
9. `mark_segments()` - 10 edges
10. `Liveness probe + DB connectivity + per-agency data-load status.` - 8 edges

## Surprising Connections (you probably didn't know these)
- `create_app()` --calls--> `app()`  [INFERRED]
  app/__init__.py → tests/conftest.py
- `Verify a Firebase ID token and return the decoded claims.` --uses--> `User`  [INFERRED]
  app/auth.py → app/models.py
- `Decorator that requires a valid Firebase auth token.      Sets g.current_user to` --uses--> `User`  [INFERRED]
  app/auth.py → app/models.py
- `register_cli()` --calls--> `create_app()`  [INFERRED]
  app/cli.py → app/__init__.py
- `create_user()` --calls--> `User`  [INFERRED]
  app/data_loader.py → app/models.py

## Hyperedges (group relationships)
- **Automated Deployment Pipeline** — github_actions, fly_io, vercel [EXTRACTED 1.00]
- **Flask Backend Runtime Stack** — flask, sqlalchemy, gunicorn [EXTRACTED 1.00]
- **React Frontend Stack** — react, vite, leaflet [EXTRACTED 1.00]
- **Authentication Flow** — firebase_auth, google_sign_in, react_frontend [EXTRACTED 1.00]
- **Data Ingestion & Storage Pipeline** — data_loader, onebusaway_api, sqlite [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (10): App(), cleanLabel(), getRouteDisplayText(), useAuth(), ErrorBoundary, Leaflet Map Library, React Framework, React-Leaflet (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.12
Nodes (27): bulk_delete_segments(), debug_directions(), _diff_achievements(), _evaluate_achievements(), get_activity(), get_leaderboard(), get_me(), get_progress() (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.25
Nodes (26): List routes with total possible segment counts (cached client-side)., Top users by total segments. Supports period filter and pagination.      Query p, Public, read-only view of another explorer's progress.      Returns the same sha, Rich stats payload: totals, achievements, top routes, 14d sparkline, rank., Recent rides, collapsed by adjacent hops in same direction (30-min window)., Liveness probe + DB connectivity + per-agency data-load status., Per-route completion summary. Constant-query: O(1) DB calls regardless of N., Mark a contiguous run of segments as completed.      Returns: { created, skipped (+18 more)

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (20): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, register_cli() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.12
Nodes (4): cached(), fetchRouteDetail(), fetchRoutes(), fetchStops()

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (9): app(), auth_headers(), Flask-CORS, Flask-Limiter, Flask-Migrate, create_app(), _init_firebase(), Flask app factory for Transit Explorer.  Boot model (kept deliberately simple) (+1 more)

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (5): add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create, baseline schema  Revision ID: f838d5f10e83 Revises:  Create Date: 2026-04-21 14:, upgrade(), SQLAlchemy ORM

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (6): MapLegend(), formatDuration(), getTripStats(), readTripTimes(), recordTripTime(), PickOverlay()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (8): Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), get_engine(), get_engine_url(), run_migrations_online(), Flask Framework

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
Cohesion: 0.4
Nodes (2): groupIntoJourneys(), makeJourney()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (4): Fly.io (Backend Hosting), GitHub Actions (CI/CD), Single Machine Deployment Rationale, Vercel (Frontend Hosting)

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (3): Firebase Auth, Firebase Keys Not Secrets Rationale, Google Sign-In

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): Vite Bundler

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (2): SQLite Database, SQLite for Single-Instance Rationale

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): Frontend Favicon, React Logo (asset)

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (1): PostgreSQL Database

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): Gunicorn WSGI Server

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): OneBusAway API

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): CARTO Basemap Tiles

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): In-Process Loader Design Rationale

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (1): Leaderboard Ranking (UI)

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Vite (logo)

## Knowledge Gaps
- **41 isolated node(s):** `Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap`, `Refresh transit routes/stops/directions from OneBusAway.`, `Print the per-agency DataLoad state as JSON.`, `Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s`, `Static fallback config. The Flask app factory reads env vars directly,     so th` (+36 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 10`** (7 nodes): `groupIntoJourneys()`, `makeJourney()`, `PPAchievements()`, `PPOverview()`, `PPRoutes()`, `PublicProfile()`, `PublicProfile.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (6 nodes): `UserProgress.jsx`, `formatDurationMs()`, `groupIntoJourneys()`, `makeJourney()`, `parseDurationInput()`, `UserProgress()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (3 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `vite.config.js`, `Vite Bundler`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (2 nodes): `SQLite Database`, `SQLite for Single-Instance Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (2 nodes): `Frontend Favicon`, `React Logo (asset)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `PostgreSQL Database`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `Gunicorn WSGI Server`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `OneBusAway API`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `CARTO Basemap Tiles`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `In-Process Loader Design Rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `Leaderboard Ranking (UI)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Vite (logo)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `React Framework` connect `Community 0` to `Community 10`, `Community 14`, `Community 7`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `Flask Framework` connect `Community 8` to `Community 1`, `Community 3`, `Community 5`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `SQLAlchemy ORM` connect `Community 6` to `Community 1`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Stop` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Stop` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `RouteDirection` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`RouteDirection` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 17 INFERRED edges - model-reasoned connections that need verification._