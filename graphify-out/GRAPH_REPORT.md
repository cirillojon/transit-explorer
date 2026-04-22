# Graph Report - .  (2026-04-22)

## Corpus Check
- 58 files · ~54,567 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 326 nodes · 641 edges · 21 communities detected
- Extraction: 76% EXTRACTED · 24% INFERRED · 0% AMBIGUOUS · INFERRED: 153 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_React UI Components|React UI Components]]
- [[_COMMUNITY_API Endpoint Docstrings|API Endpoint Docstrings]]
- [[_COMMUNITY_Backend API Handlers|Backend API Handlers]]
- [[_COMMUNITY_Auth & App Bootstrap|Auth & App Bootstrap]]
- [[_COMMUNITY_Flask CLI Commands|Flask CLI Commands]]
- [[_COMMUNITY_Frontend Stack & Hosting|Frontend Stack & Hosting]]
- [[_COMMUNITY_Frontend API Client|Frontend API Client]]
- [[_COMMUNITY_DB Migration Scripts|DB Migration Scripts]]
- [[_COMMUNITY_Segment Marking Tests|Segment Marking Tests]]
- [[_COMMUNITY_Public Profile UI|Public Profile UI]]
- [[_COMMUNITY_OneBusAway Service Layer|OneBusAway Service Layer]]
- [[_COMMUNITY_Product Features (Gamification)|Product Features (Gamification)]]
- [[_COMMUNITY_Hero Screenshot UI|Hero Screenshot UI]]
- [[_COMMUNITY_Leaderboard Tests|Leaderboard Tests]]
- [[_COMMUNITY_Auth Tests|Auth Tests]]
- [[_COMMUNITY_Config Module|Config Module]]
- [[_COMMUNITY_Health Endpoint Tests|Health Endpoint Tests]]
- [[_COMMUNITY_Frontend API Tests|Frontend API Tests]]
- [[_COMMUNITY_Frontend Brand Assets|Frontend Brand Assets]]
- [[_COMMUNITY_Leaderboard Ranking (UI)|Leaderboard Ranking (UI)]]
- [[_COMMUNITY_Vite logo asset|Vite logo asset]]

## God Nodes (most connected - your core abstractions)
1. `React Framework` - 33 edges
2. `Route` - 23 edges
3. `Stop` - 22 edges
4. `RouteDirection` - 22 edges
5. `User` - 20 edges
6. `DataLoad` - 19 edges
7. `RouteStop` - 17 edges
8. `UserSegment` - 17 edges
9. `Flask Backend` - 14 edges
10. `mark_segments()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Fly.io (Backend Hosting)` --references--> `Flask Backend`  [INFERRED]
  README.md → docs/ARCHITECTURE.md
- `Verify a Firebase ID token and return the decoded claims.` --uses--> `User`  [INFERRED]
  /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/auth.py → /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py
- `Decorator that requires a valid Firebase auth token.      Sets g.current_user to` --uses--> `User`  [INFERRED]
  /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/auth.py → /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer/app/models.py
- `Transit Explorer` --references--> `Flask Backend`  [EXTRACTED]
  README.md → docs/ARCHITECTURE.md
- `Flask Backend` --calls--> `Gunicorn WSGI Server`  [EXTRACTED]
  docs/ARCHITECTURE.md → requirements.txt

## Hyperedges (group relationships)
- **Automated Deployment Pipeline** — github_actions, fly_io, vercel [EXTRACTED 1.00]
- **Flask Backend Runtime Stack** — flask, sqlalchemy, gunicorn [EXTRACTED 1.00]
- **React Frontend Stack** — react, vite, leaflet [EXTRACTED 1.00]
- **Authentication Flow** — firebase_auth, google_sign_in, react_frontend [EXTRACTED 1.00]
- **Data Ingestion & Storage Pipeline** — data_loader, onebusaway_api, sqlite [EXTRACTED 1.00]

## Communities

### Community 0 - "React UI Components"
Cohesion: 0.05
Nodes (26): Achievements(), App(), cleanLabel(), getRouteDisplayText(), AuthProvider(), useAuth(), ConfirmDialog(), ErrorBoundary (+18 more)

### Community 1 - "API Endpoint Docstrings"
Cohesion: 0.19
Nodes (30): List routes with total possible segment counts (cached client-side)., Top users by total segments. Supports period filter and pagination.      Query p, Public, read-only view of another explorer's progress.      Returns the same sha, Rich stats payload: totals, achievements, top routes, 14d sparkline, rank., Recent rides, collapsed by adjacent hops in same direction (30-min window)., Liveness probe + DB connectivity + per-agency data-load status., Per-route completion summary. Constant-query: O(1) DB calls regardless of N., Mark a contiguous run of segments as completed.      Returns: { created, skipped (+22 more)

### Community 2 - "Backend API Handlers"
Cohesion: 0.14
Nodes (29): bulk_delete_segments(), debug_directions(), delete_segment(), _diff_achievements(), _evaluate_achievements(), get_activity(), get_leaderboard(), get_me() (+21 more)

### Community 3 - "Auth & App Bootstrap"
Cohesion: 0.1
Nodes (28): Verify a Firebase ID token and return the decoded claims., Decorator that requires a valid Firebase auth token.      Sets g.current_user to, require_auth(), verify_firebase_token(), OneBusAway Data Loader, get_engine(), get_engine_url(), run_migrations_offline() (+20 more)

### Community 4 - "Flask CLI Commands"
Cohesion: 0.17
Nodes (20): data_check_schema(), data_load(), data_status(), Flask CLI commands for Transit Explorer.  Registered in app/__init__.py via ap, Refresh transit routes/stops/directions from OneBusAway., Print the per-agency DataLoad state as JSON., Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s, register_cli() (+12 more)

### Community 5 - "Frontend Stack & Hosting"
Cohesion: 0.16
Nodes (18): CARTO Basemap Tiles, Fly.io (Backend Hosting), GitHub Actions (CI/CD), Leaflet Map Library, React Frontend (Vite SPA), React-Leaflet, Single Machine Deployment Rationale, decode() (+10 more)

### Community 6 - "Frontend API Client"
Cohesion: 0.21
Nodes (18): bulkDeleteSegments(), cached(), deleteSegment(), fetchActivity(), fetchHealth(), fetchLeaderboard(), fetchMe(), fetchProgress() (+10 more)

### Community 7 - "DB Migration Scripts"
Cohesion: 0.2
Nodes (10): downgrade(), add user_segments.duration_ms  Revision ID: a1c2e4f9b701 Revises: f838d5f10e8, upgrade(), downgrade(), add data_loads table  Revision ID: b3d09f1e2c44 Revises: a1c2e4f9b701 Create, upgrade(), downgrade(), baseline schema  Revision ID: f838d5f10e83 Revises:  Create Date: 2026-04-21 14: (+2 more)

### Community 8 - "Segment Marking Tests"
Cohesion: 0.29
Nodes (9): If pair_keys[0] was already marked, duration_ms must still land on     the firs, duration_ms on a fresh multi-hop mark attaches to the first new row., test_mark_segments_attaches_duration_to_first_new_row(), test_mark_segments_persists_duration_on_first_row(), test_mark_segments_rejects_missing_stop(), test_mark_segments_rejects_oversize_notes(), test_mark_segments_validates_id_format(), test_mark_segments_validates_required_fields() (+1 more)

### Community 9 - "Public Profile UI"
Cohesion: 0.46
Nodes (6): groupIntoJourneys(), makeJourney(), PPAchievements(), PPOverview(), PPRoutes(), PublicProfile()

### Community 10 - "OneBusAway Service Layer"
Cohesion: 0.43
Nodes (5): fetch_routes_for_agency(), fetch_stops_for_route(), get_client(), Fetch all routes for a given agency., Fetch stops grouped by direction with polylines for a route.      Uses raw HTTP

### Community 11 - "Product Features (Gamification)"
Cohesion: 0.43
Nodes (7): Achievements & Badges, Gamification, Leaderboard System, Mobile-First UX, Route Tracking, Segment Logging, Transit Explorer

### Community 12 - "Hero Screenshot UI"
Cohesion: 0.33
Nodes (7): Interactive Map View (UI), Progress Tracking (UI), Route Segment (UI), Transit Routes List (UI), Seattle Map Geography, Transit Stop (UI), Transit Explorer App (UI)

### Community 13 - "Leaderboard Tests"
Cohesion: 0.53
Nodes (4): test_debug_directions_blocked_in_production(), test_leaderboard_empty(), test_leaderboard_includes_user_after_marking(), test_leaderboard_invalid_pagination()

### Community 14 - "Auth Tests"
Cohesion: 0.53
Nodes (4): test_invalid_token_claims_rejected(), test_me_accepts_mocked_token(), test_me_rejects_malformed_header(), test_me_requires_auth()

### Community 15 - "Config Module"
Cohesion: 0.5
Nodes (2): Config, Static fallback config. The Flask app factory reads env vars directly,     so th

### Community 16 - "Health Endpoint Tests"
Cohesion: 0.67
Nodes (1): test_health_ok()

### Community 17 - "Frontend API Tests"
Cohesion: 0.67
Nodes (1): currentUser()

### Community 18 - "Frontend Brand Assets"
Cohesion: 1.0
Nodes (2): Frontend Favicon, React Logo (asset)

### Community 31 - "Leaderboard Ranking (UI)"
Cohesion: 1.0
Nodes (1): Leaderboard Ranking (UI)

### Community 32 - "Vite logo asset"
Cohesion: 1.0
Nodes (1): Vite (logo)

## Knowledge Gaps
- **28 isolated node(s):** `Refresh transit routes/stops/directions from OneBusAway.`, `Print the per-agency DataLoad state as JSON.`, `Exit 1 if SQLAlchemy models drift from alembic head.      Used by `bin/check-s`, `Static fallback config. The Flask app factory reads env vars directly,     so th`, `Per-agency snapshot of the last OneBusAway data import.      One row per agency.` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Config Module`** (4 nodes): `config.py`, `Config`, `Static fallback config. The Flask app factory reads env vars directly,     so th`, `config.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Health Endpoint Tests`** (3 nodes): `test_health.py`, `test_health_ok()`, `test_health.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend API Tests`** (3 nodes): `currentUser()`, `api.test.js`, `api.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Brand Assets`** (2 nodes): `Frontend Favicon`, `React Logo (asset)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Leaderboard Ranking (UI)`** (1 nodes): `Leaderboard Ranking (UI)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite logo asset`** (1 nodes): `Vite (logo)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Flask Backend` connect `Auth & App Bootstrap` to `Product Features (Gamification)`, `Frontend Stack & Hosting`, `DB Migration Scripts`?**
  _High betweenness centrality (0.298) - this node is a cross-community bridge._
- **Why does `React Framework` connect `React UI Components` to `Public Profile UI`, `Frontend Stack & Hosting`?**
  _High betweenness centrality (0.267) - this node is a cross-community bridge._
- **Why does `React Frontend (Vite SPA)` connect `Frontend Stack & Hosting` to `React UI Components`, `Auth & App Bootstrap`, `Product Features (Gamification)`?**
  _High betweenness centrality (0.260) - this node is a cross-community bridge._
- **Are the 19 inferred relationships involving `Route` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Route` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `Stop` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`Stop` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 19 inferred relationships involving `RouteDirection` (e.g. with `Refresh transit data for the requested agencies (TTL gated).` and `Liveness probe + DB connectivity + per-agency data-load status.`) actually correct?**
  _`RouteDirection` has 19 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `User` (e.g. with `Verify a Firebase ID token and return the decoded claims.` and `Decorator that requires a valid Firebase auth token.      Sets g.current_user to`) actually correct?**
  _`User` has 17 INFERRED edges - model-reasoned connections that need verification._