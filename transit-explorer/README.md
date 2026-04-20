# Transit Explorer

A gamified transit map for Seattle. Ride a bus or train, mark the segment you traveled, and watch your map fill in. Earn achievements, climb the leaderboard, and discover the parts of the network you've never been on.

**Stack:** Flask + SQLAlchemy backend · React + Vite + Leaflet frontend · Firebase Auth · OneBusAway data · Docker · SQLite (Postgres-ready).

---

## Architecture

```
 ┌────────────────┐   HTTPS   ┌──────────────────┐    ┌────────────────────┐
 │  React (Vite)  │ ────────► │  Flask + gunicorn│ ──►│  OneBusAway API    │
 │  Cloudflare    │   /api    │   (Docker)       │    └────────────────────┘
 │  Pages / nginx │ ◄──────── │   gunicorn       │ ──►┌────────────────────┐
 └───────┬────────┘   JSON    │   --preload      │    │  SQLite (volume)   │
         │                    └─────────┬────────┘    └────────────────────┘
         │ Firebase Auth                │
         ▼                              ▼
   Google Sign-in            Firebase Admin (token verify)
```

- **Backend** preloads OBA route/stop data into SQLite at startup, then serves a small REST API. Workers share the loaded dataset via gunicorn's `--preload` (fork COW) so memory stays bounded.
- **Frontend** is a single-page React app. Tile layer from CARTO, polylines from Google encoded polyline format, auth via Firebase Google sign-in.
- **Persistence:** SQLite on a mounted volume. The schema is small enough that this works comfortably for a single-instance deployment; switch to Postgres only if you outgrow it.

---

## Quick start (local dev)

### Prerequisites

- Python 3.11+
- Node 20+
- An [OneBusAway API key](https://onebusaway.org/contact/)
- A Firebase project with Google sign-in enabled and a downloaded service-account JSON

### Backend

```bash
cd transit-explorer

# 1. Configure
cp .env.example .env
#   Edit .env and fill in OBA_API_KEY, FIREBASE_PROJECT_ID, etc.
#   Drop your Firebase service-account JSON next to .env as service-account.json

# 2. Install
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. (One-time) generate the initial DB migration
FLASK_APP=app.py flask db migrate -m "initial schema"
FLASK_APP=app.py flask db upgrade

# 4. Run
FLASK_APP=app.py flask run --port 8880
```

The first run downloads route + stop data from OneBusAway (~30s).

### Frontend

```bash
cd tm-frontend
cp .env.example .env
#   Fill in VITE_FIREBASE_* values from Firebase console.
#   Leave VITE_API_BASE_URL blank in dev; set VITE_PROXY_URL=http://localhost:8880
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

---

## Environment variables

### Backend (`.env`)

| Variable                         | Required | Default                         | Notes                                                                 |
| -------------------------------- | -------- | ------------------------------- | --------------------------------------------------------------------- |
| `OBA_API_KEY`                    | yes      | —                               | OneBusAway API key                                                    |
| `GOOGLE_APPLICATION_CREDENTIALS` | local    | —                               | Path to Firebase service-account JSON                                 |
| `FIREBASE_PROJECT_ID`            | prod     | —                               | Used when running on GCP with workload identity                       |
| `SQLALCHEMY_DATABASE_URI`        | no       | `sqlite:///tm-instance/data.db` | Override to point at Postgres                                         |
| `ALLOWED_ORIGINS`                | prod     | `""` (deny in prod, `*` in dev) | Comma-separated origin allow-list for `/api/*`                        |
| `FLASK_PORT`                     | no       | `5000` (dev) / `8880` (Docker)  | Port the server binds                                                 |
| `FLASK_DEBUG`                    | no       | `0`                             | Set `1` to enable Flask debugger (never in prod)                      |
| `LOG_LEVEL`                      | no       | `INFO`                          | `DEBUG` / `INFO` / `WARNING` / `ERROR`                                |
| `WEB_CONCURRENCY`                | no       | `2`                             | Gunicorn workers — keep low; `--preload` shares OBA data via fork COW |
| `GUNICORN_TIMEOUT`               | no       | `120`                           | Per-request timeout                                                   |

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

All endpoints under `/api`. Endpoints marked 🔒 require a `Authorization: Bearer <Firebase ID token>` header.

| Method    | Path                                       | Description                                               |
| --------- | ------------------------------------------ | --------------------------------------------------------- |
| GET       | `/api/health`                              | Liveness + DB check                                       |
| GET       | `/api/routes`                              | All routes (cached 5min)                                  |
| GET       | `/api/routes/<route_id>`                   | Route detail with directions and decoded polylines        |
| GET       | `/api/stops?route_id=...`                  | Stops for a route                                         |
| GET       | `/api/leaderboard?period=all\|week\|month` | Top users with pagination                                 |
| 🔒 GET    | `/api/me`                                  | Current user profile                                      |
| 🔒 GET    | `/api/me/progress`                         | Per-route segment counts                                  |
| 🔒 GET    | `/api/me/stats`                            | Rank, sparkline, top routes, achievements                 |
| 🔒 GET    | `/api/me/activity`                         | Recent journeys (adjacent hops collapsed)                 |
| 🔒 POST   | `/api/me/segments`                         | Mark hops; returns `{created, skipped, new_achievements}` |
| 🔒 DELETE | `/api/me/segments/bulk`                    | Bulk-delete segments                                      |

---

## Database & migrations

The app uses Flask-Migrate / Alembic. The migrations directory lives at `app/migrations/`.

```bash
# Generate a new migration after model changes
FLASK_APP=app.py flask db migrate -m "add foo"

# Apply migrations
FLASK_APP=app.py flask db upgrade

# In Docker, gunicorn_startup.sh runs `flask db upgrade` automatically on boot.
# To skip: set SKIP_DB_UPGRADE=1.
```

To switch to Postgres in production, set `SQLALCHEMY_DATABASE_URI=postgresql+psycopg2://...` and add `psycopg2-binary` to `requirements.txt`.

---

## Backup & restore

`backup.sh` takes an online (consistent) snapshot of the SQLite database from a running container, gzips it, and rotates old backups.

```bash
# One-off
./backup.sh

# Cron — daily at 03:00, retain 30 days, write to /var/backups/tm
0 3 * * *   cd /opt/transit-explorer && BACKUP_DIR=/var/backups/tm RETAIN=30 ./backup.sh >> /var/log/tm-backup.log 2>&1
```

**Restore:**

```bash
docker stop tm-blue
gunzip -c backups/data-20260420-030000.db.gz > /tmp/restore.db
docker cp /tmp/restore.db tm-blue:/app/tm-instance/data.db
docker start tm-blue
```

---

## Deployment

The image is fully self-contained for the **backend**. The **frontend** is a static SPA — build it once and host the `dist/` folder anywhere.

### Recommended setup (cheapest, simplest)

| Layer    | Provider             | Cost        | Why                                                |
| -------- | -------------------- | ----------- | -------------------------------------------------- |
| Frontend | Cloudflare Pages     | Free        | Global CDN, custom domain free, GitHub auto-deploy |
| Backend  | Fly.io (1 GB shared) | ~$3 / month | Container-native, free TLS, built-in volumes       |
| Volume   | Fly volume (3 GB)    | Free tier   | Persists SQLite across deploys                     |
| DB       | SQLite (on volume)   | Free        | Right-sized for this workload                      |

#### A. Backend on Fly.io

```bash
# One-time setup
brew install flyctl                    # or curl -L https://fly.io/install.sh | sh
fly auth signup
fly launch --no-deploy                 # picks up Dockerfile + fly.toml
fly volumes create tm_data --size 3 --region sea

fly secrets set \
  OBA_API_KEY="..." \
  FIREBASE_PROJECT_ID="..." \
  ALLOWED_ORIGINS="https://your-frontend.pages.dev"

# Upload the Firebase service-account JSON as a secret + drop it in via release
fly secrets set GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)"
# In your image, write it to /app/service-account.json on boot (e.g. add to gunicorn_startup.sh:
#   if [ -n "$GOOGLE_APPLICATION_CREDENTIALS_JSON" ]; then
#       echo "$GOOGLE_APPLICATION_CREDENTIALS_JSON" > /app/service-account.json
#   fi)

fly deploy
```

Subsequent deploys are just `fly deploy` (zero-downtime, machine-by-machine rolling update).

#### B. Frontend on Cloudflare Pages

1. Push this repo to GitHub.
2. Cloudflare Pages → Create project → connect repo.
3. **Build command:** `npm install && npm run build`
4. **Build output directory:** `dist`
5. **Root directory:** `tm-frontend`
6. **Environment variables:** all the `VITE_*` values from your local `.env`, with `VITE_API_BASE_URL=https://transit-explorer.fly.dev` (or whatever your Fly URL is).
7. Save → first build runs.
8. Add your Firebase auth domain in Firebase Console → Authentication → Settings → Authorized domains.
9. Set `ALLOWED_ORIGINS` on Fly to match your Pages URL.

### Alternative: GCP VM with blue/green nginx

If you want to keep the existing GCP setup, the included `prod_container_update.sh` does zero-downtime blue/green deploys behind nginx. Two notes:

- **Right-size the VM:** an `e2-small` (2 GB) struggled because of `(2*cpu)+1` workers. The new `gunicorn_startup.sh` defaults to `WEB_CONCURRENCY=2` with `--preload`, which fits comfortably in 1 GB. If you still hit OOM, bump to `e2-medium` (4 GB, ~$24/mo).
- **Frontend:** nothing in this repo builds the React app on the VM. Either push the built `dist/` separately, or run the included `docker-compose.yml` which adds an nginx-static container.

### Local prod-like stack

```bash
cd tm-frontend && npm install && npm run build && cd ..
docker compose up --build
# → http://localhost:8080
```

### Hosting options I considered and rejected

- **Cloud Run** — stateless; the in-memory preloaded OBA data + SQLite file don't fit without paying for Cloud SQL.
- **Render free tier** — sleeps after inactivity, and the ~30s OBA preload makes cold starts terrible.
- **Heroku** — no longer has a free tier, more expensive than Fly for the same RAM.

---

## Layout

```
transit-explorer/
├── app.py                     # Entrypoint
├── app/
│   ├── __init__.py            # Flask app factory: CORS, Firebase, migrations
│   ├── auth.py                # Firebase token verification, require_auth decorator
│   ├── config.py
│   ├── data_loader.py         # OneBusAway → SQLite ingester
│   ├── models.py              # SQLAlchemy models
│   ├── oba_service.py         # OneBusAway API client wrapper
│   ├── routes/api.py          # All HTTP endpoints
│   └── migrations/            # Alembic
├── tests/                     # pytest tests
├── tm-frontend/               # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/        # Map, RouteList, Leaderboard, …
│   │   ├── services/api.js    # Axios + cache + dedupe
│   │   └── contexts/AuthContext.jsx
│   └── vite.config.js
├── Dockerfile                 # Backend image
├── docker-compose.yml         # Local prod-like stack (backend + nginx + dist)
├── nginx.conf                 # Used by docker-compose
├── fly.toml                   # Fly.io deploy config
├── gunicorn_startup.sh        # Entrypoint inside Docker
├── backup.sh                  # Online SQLite snapshot + rotation
├── prod_container_update.sh   # GCP VM blue/green deploy
└── dev_container_update.sh    # Local one-shot rebuild + run
```

---

## Security notes

- **Never commit `.env` or `service-account.json`.** Both are gitignored.
- **`OBA_API_KEY` is sensitive** — server-side only, treated as a secret.
- **Firebase web config (`VITE_FIREBASE_*`) is public** — protect Firestore/Auth via rules + App Check, not key obscurity.
- **CORS** defaults to deny-all in production. Set `ALLOWED_ORIGINS` to a comma-separated list of frontend origins.
- **`/api/health`** is unauthenticated by design (used by load balancers / Fly checks).

---

## License

MIT.
