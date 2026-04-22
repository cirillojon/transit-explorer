# Architecture & Reference

Technical reference for Transit Explorer. The product overview lives in
[the root README](../README.md); the day-to-day operations guide lives in
[DEVELOPMENT.md](./DEVELOPMENT.md).

---

## Architecture

```
 ┌────────────────┐   HTTPS   ┌──────────────────┐    ┌────────────────────┐
 │  React (Vite)  │ ────────► │  Flask + gunicorn│ ──►│  OneBusAway API    │
 │  Vercel        │   /api    │   (Docker, Fly)  │    └────────────────────┘
 │  (static SPA)  │ ◄──────── │   gunicorn       │ ──►┌────────────────────┐
 └───────┬────────┘   JSON    │   --preload      │    │  SQLite (Fly vol)  │
         │                    └─────────┬────────┘    └────────────────────┘
         │ Firebase Auth                │
         ▼                              ▼
   Google Sign-in            Firebase Admin (token verify)
```

- **Backend** boots through `bin/start prod`: it runs `flask db upgrade` + a schema-drift check under a flock, then spawns a background `flask data load --loop` (the in-process OBA loader) before exec'ing gunicorn with `--preload`. `create_app()` itself does no data fetching or migrations; it just wires extensions and blueprints.
- **Frontend** is a single-page React app. Tile layer from CARTO, polylines from Google encoded polyline format, auth via Firebase Google sign-in.
- **Persistence:** SQLite on a mounted volume. The schema is small enough that this works comfortably for a single-instance deployment; switch to Postgres only if you outgrow it.

---

## Environment variables

### Backend (`.env`)

| Variable                              | Required | Default                         | Notes                                                                                    |
| ------------------------------------- | -------- | ------------------------------- | ---------------------------------------------------------------------------------------- |
| `OBA_API_KEY`                         | yes      | —                               | OneBusAway API key                                                                       |
| `GOOGLE_APPLICATION_CREDENTIALS`      | local    | —                               | Path to a Firebase service-account JSON file                                             |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | prod     | —                               | Optional JSON secret materialized to disk by `bin/start` on boot                         |
| `FIREBASE_PROJECT_ID`                 | fallback | `""`                            | Used when no service-account file is mounted                                             |
| `SQLALCHEMY_DATABASE_URI`             | no       | `sqlite:///tm-instance/data.db` | Override to point at Postgres                                                            |
| `ALLOWED_ORIGINS`                     | prod     | `""`                            | Comma-separated origin allow-list for `/api/*`; blank denies browser origins outside dev |
| `FLASK_ENV`                           | no       | `production`                    | If set to `development` and `ALLOWED_ORIGINS` is blank, CORS falls back to `*`           |
| `FLASK_PORT`                          | no       | `5000` / `8880` in Docker       | Port the server binds                                                                    |
| `FLASK_DEBUG`                         | no       | `0`                             | Used by `flask run` in local development                                                 |
| `LOG_LEVEL`                           | no       | `INFO`                          | `DEBUG` / `INFO` / `WARNING` / `ERROR`                                                   |
| `WEB_CONCURRENCY`                     | no       | `4`                             | Gunicorn workers; raise if you scale the Fly machine up                                  |
| `GUNICORN_TIMEOUT`                    | no       | `30`                            | Per-request timeout for gunicorn (seconds)                                               |
| `SKIP_DB_UPGRADE`                     | no       | `0`                             | Set `1` to skip the `bin/start` boot-time `flask db upgrade`                             |
| `SKIP_DATA_LOAD`                      | no       | `0`                             | Skip the `bin/start dev`/`prod` first-boot auto-seed                                     |
| `AUTO_SEED_ON_EMPTY`                  | no       | `1`                             | In `bin/start dev`/`prod`, kick off a one-shot `flask data load` if the DB is empty      |
| `RUN_INPROC_LOADER`                   | no       | `1`                             | In `bin/start prod`, set `0` to disable the background `flask data load --loop`          |
| `OBA_REFRESH_TTL_HOURS`               | no       | `24`                            | Per-agency refresh interval used by the in-process loader loop                           |
| `AUTO_UPGRADE_ON_BOOT`                | no       | `0`                             | Escape hatch: re-run `flask db upgrade` from inside `create_app()`                       |
| `RATELIMIT_STORAGE_URI`               | no       | `memory://`                     | Flask-Limiter storage backend. Use `redis://...` for cross-worker global limits          |
| `RATELIMIT_ENABLED`                   | no       | `True`                          | Set `False` (case-insensitive) to disable all rate limiting — used by tests              |
| `DATABASE_URL`                        | no       | —                               | Legacy fallback only; `SQLALCHEMY_DATABASE_URI` takes precedence                         |

### Frontend (`tm-frontend/.env`)

| Variable                            | Required | Notes                                            |
| ----------------------------------- | -------- | ------------------------------------------------ |
| `VITE_API_BASE_URL`                 | prod     | Full URL of the deployed backend                 |
| `VITE_PROXY_URL`                    | dev      | Backend URL for the dev-server proxy             |
| `VITE_FIREBASE_API_KEY`             | yes      | All `VITE_FIREBASE_*` come from Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN`         | yes      |                                                  |
| `VITE_FIREBASE_PROJECT_ID`          | yes      |                                                  |
| `VITE_FIREBASE_STORAGE_BUCKET`      | yes      |                                                  |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes      |                                                  |
| `VITE_FIREBASE_APP_ID`              | yes      |                                                  |

> The frontend `VITE_FIREBASE_*` values are **not secrets** — they're shipped in the bundle. Protect access via Firebase Auth domain restrictions and App Check, not by hiding the keys.

---

## API

All endpoints under `/api`. Endpoints marked 🔒 require an `Authorization: Bearer <Firebase ID token>` header.

| Method    | Path                                       | Description                                                                         |
| --------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| GET       | `/api/health`                              | Liveness probe plus DB connectivity and route count                                 |
| GET       | `/api/debug/directions`                    | Debug-only summary of route-direction/polyline coverage                             |
| GET       | `/api/routes`                              | All routes with computed `total_segments` (cached 5 minutes)                        |
| GET       | `/api/routes/<route_id>`                   | Route detail with directions, encoded polylines, stop map, and `total_segments`     |
| GET       | `/api/stops`                               | All loaded stops                                                                    |
| GET       | `/api/leaderboard?period=all\|week\|month` | Top users with pagination via `limit` and `offset`                                  |
| 🔒 GET    | `/api/me`                                  | Current user profile plus summary totals                                            |
| 🔒 GET    | `/api/me/progress`                         | Per-route completion summary with segment detail                                    |
| 🔒 GET    | `/api/me/stats`                            | Rank, 14-day sparkline, top routes, and achievements                                |
| 🔒 GET    | `/api/me/activity`                         | Recent journeys collapsed across adjacent hops in the same direction                |
| 🔒 POST   | `/api/me/segments`                         | Mark a contiguous run of hops; returns `created`, `skipped`, `segments`, and totals |
| 🔒 PUT    | `/api/me/segments/<segment_id>/notes`      | Update notes on a previously logged segment                                         |
| 🔒 PUT    | `/api/me/segments/<segment_id>/duration`   | Update the recorded ride duration on a logged segment                               |
| 🔒 DELETE | `/api/me/segments/<segment_id>`            | Delete a single logged segment                                                      |
| 🔒 DELETE | `/api/me/segments/bulk`                    | Bulk-delete by `ids[]`, or wipe an entire route with `route_id` + `confirm=true`    |

---

## Database & migrations

The app uses Flask-Migrate / Alembic. The migrations directory lives at `app/migrations/`.

```bash
# Generate a new migration after model changes
FLASK_APP=app.py flask db migrate -m "add foo"

# Apply migrations
FLASK_APP=app.py flask db upgrade

# In Docker, `bin/start prod` runs `flask db upgrade` automatically on boot.
# To skip: set SKIP_DB_UPGRADE=1.
```

To switch to Postgres in production, set `SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://...` and add `psycopg2-binary` to `requirements.txt`.

---

## Backup & restore

`backup.sh` takes an online SQLite snapshot from a running Docker container, gzips it, and rotates old backups. If your container name does not start with `tm-`, pass it explicitly with `CONTAINER=<name>`.

```bash
# One-off
CONTAINER=transit-explorer-backend-1 ./backup.sh

# Cron — daily at 03:00, retain 30 days, write to /var/backups/tm
0 3 * * *   cd /opt/transit-explorer && BACKUP_DIR=/var/backups/tm RETAIN=30 ./backup.sh >> /var/log/tm-backup.log 2>&1
```

**Restore:**

```bash
CONTAINER=transit-explorer-backend-1
docker stop "$CONTAINER"
gunzip -c backups/data-20260420-030000.db.gz > /tmp/restore.db
docker cp /tmp/restore.db "$CONTAINER":/app/tm-instance/data.db
docker start "$CONTAINER"
```

---

## First-time deployment setup

> Day-to-day deploys are described in [DEVELOPMENT.md](./DEVELOPMENT.md). The steps
> below are the one-time setup that produced the live deployment, kept for
> reference if you ever need to re-create the environment from scratch.

### Backend on Fly.io

```bash
# One-time
curl -L https://fly.io/install.sh | sh        # installs flyctl
flyctl auth login

cd transit-explorer
flyctl launch --no-deploy --copy-config --name transit-explorer --yes
flyctl volumes create tm_data --size 3 --region sjc --yes

# Secrets (file-based JSON gets materialized to disk by bin/start on boot)
flyctl secrets set \
  OBA_API_KEY="..." \
  FIREBASE_PROJECT_ID="transit-explorer-55b66" \
  ALLOWED_ORIGINS="https://transit-explorer-ten.vercel.app" \
  GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)"

flyctl deploy --remote-only --ha=false
```

`fly.toml` already pins `WEB_CONCURRENCY=4`, `GUNICORN_TIMEOUT=30`, `OBA_REFRESH_TTL_HOURS=24`, and a 3-minute healthcheck grace period. Migrations and OBA loading are handled by `bin/start prod`. `gunicorn_startup.sh` is now a thin backwards-compat shim that just `exec`s `bin/start prod`.

### Frontend on Vercel

1. **vercel.com → New Project → Import** the GitHub repository.
2. Settings:
   - Framework Preset: **Vite**
   - Root Directory: `tm-frontend`
   - Build / Output / Install commands: defaults are fine.
3. Environment variables (all `Production`, `Preview`, `Development`):

   | Name                                | Value                                        |
   | ----------------------------------- | -------------------------------------------- |
   | `VITE_API_BASE_URL`                 | `https://transit-explorer.fly.dev`           |
   | `VITE_FIREBASE_API_KEY`             | from Firebase console                        |
   | `VITE_FIREBASE_AUTH_DOMAIN`         | `transit-explorer-55b66.firebaseapp.com`     |
   | `VITE_FIREBASE_PROJECT_ID`          | `transit-explorer-55b66`                     |
   | `VITE_FIREBASE_STORAGE_BUCKET`      | `transit-explorer-55b66.firebasestorage.app` |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from Firebase console                        |
   | `VITE_FIREBASE_APP_ID`              | from Firebase console                        |

4. Deploy → note the URL Vercel assigns.

### Firebase

In **Firebase Console → Authentication → Settings → Authorized domains**, add the Vercel hostname (e.g. `transit-explorer-ten.vercel.app`) and any custom domain you later attach.

### Local prod-like stack

```bash
cd tm-frontend && npm install && npm run build && cd ..
docker compose up --build
# → http://localhost:8080
```

---

## Repository layout

```
transit-explorer/
├── .github/workflows/
│   └── fly-deploy.yml         # Backend auto-deploy on pushes to main
├── app.py                     # Entrypoint for local `flask run`
├── app/
│   ├── __init__.py            # Flask app factory: CORS, Firebase, extensions, blueprints (no migrations / data fetches)
│   ├── auth.py                # Firebase token verification, require_auth decorator
│   ├── config.py
│   ├── data_loader.py         # OneBusAway → SQLite ingester
│   ├── models.py              # SQLAlchemy models
│   ├── oba_service.py         # OneBusAway API client wrapper
│   ├── routes/api.py          # All HTTP endpoints
│   └── migrations/            # Alembic
├── .env.example               # Backend env template
├── tests/                     # pytest tests
├── tm-frontend/               # React + Vite SPA
│   ├── .env.example           # Frontend env template
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/        # Map, RouteList, Leaderboard, …
│   │   ├── services/api.js    # Axios + cache + dedupe
│   │   └── contexts/AuthContext.jsx
│   └── vite.config.js
├── Dockerfile                 # Backend image
├── dev_container_update.sh    # Rebuild + restart local backend container on one port
├── docker-compose.yml         # Local prod-like stack (backend + nginx + dist)
├── nginx.conf                 # Used by docker-compose
├── fly.toml                   # Fly.io deploy config
├── bin/start                  # Canonical entrypoint (modes: dev|prod|migrate|load-data)
├── gunicorn_startup.sh        # Backwards-compat shim → execs bin/start prod
├── backup.sh                  # Online SQLite snapshot + rotation
└── docs/
    ├── ARCHITECTURE.md        # This file
    ├── DEPLOYMENT.md          # First-time Fly + Vercel setup
    ├── DEVELOPMENT.md         # Day-to-day dev & deploy guide
    └── TROUBLESHOOTING.md     # Production triage and recovery
```

---

## Security notes

- **Never commit `.env` or `service-account.json`.** Both are gitignored.
- **`OBA_API_KEY` is sensitive** — server-side only, treated as a secret.
- **Firebase web config (`VITE_FIREBASE_*`) is public** — protect Firestore/Auth via rules + App Check, not key obscurity.
- **CORS** defaults to deny-all in production. Set `ALLOWED_ORIGINS` to a comma-separated list of frontend origins.
- **`/api/health`** is unauthenticated by design (used by load balancers / Fly checks).
