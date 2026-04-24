# Deployment Guide

End-to-end checklist for deploying Transit Explorer from a fresh repo to a
working production stack.

## Architecture recap

| Component | Host       | Notes                                                                                        |
| --------- | ---------- | -------------------------------------------------------------------------------------------- |
| Backend   | Fly.io     | Single `app` process: gunicorn + in-process OBA loader loop, sharing one mounted SQLite vol. |
| Frontend  | Vercel     | Static SPA from `tm-frontend/`.                                                              |
| Auth      | Firebase   | Google sign-in only.                                                                         |
| Data      | OneBusAway | TTL-refreshed by the in-process loader; state tracked in `data_loads` table.                 |

## 1. Backend: Fly.io

### Prerequisites

- [Install flyctl](https://fly.io/docs/hands-on/install-flyctl/) and
  `flyctl auth login`.
- A Firebase project + service-account JSON.
- An OneBusAway API key.

### First-time provisioning

```bash
# Launch (uses fly.toml from this repo)
flyctl launch --no-deploy --copy-config

# Create the persistent volume for SQLite
flyctl volumes create tm_data --region sjc --size 1

# Set required secrets
flyctl secrets set \
  OBA_API_KEY="..." \
  FIREBASE_PROJECT_ID="..." \
  GOOGLE_APPLICATION_CREDENTIALS_JSON="$(cat service-account.json)" \
  ALLOWED_ORIGINS="https://transit-explorer.org,https://transit-explorer-ten.vercel.app"

# Optional secrets
flyctl secrets set \
  RATELIMIT_STORAGE_URI="redis://..." \
  LOG_LEVEL="INFO"

# Deploy
flyctl deploy --local-only --ha=false --strategy immediate
```

### Required secrets

| Secret                                | Required | Purpose                                                                                                            |
| ------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `OBA_API_KEY`                         | yes      | OneBusAway data fetches.                                                                                           |
| `FIREBASE_PROJECT_ID`                 | yes      | Verifies Firebase ID tokens.                                                                                       |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | yes      | Firebase Admin SDK credentials (JSON content, not path).                                                           |
| `ALLOWED_ORIGINS`                     | yes      | Comma-separated CORS allowlist; **must be set** in prod.                                                           |
| `RATELIMIT_STORAGE_URI`               | no       | Redis URL for cross-worker rate limits. Default per-process.                                                       |
| `SQLALCHEMY_DATABASE_URI`             | no       | Defaults to SQLite on the mounted volume.                                                                          |
| `OBA_REFRESH_TTL_HOURS`               | no       | In-process loader refresh cadence (default `24`). Set in `fly.toml [env]`.                                         |
| `RUN_INPROC_LOADER`                   | no       | Set `0` to disable the bin/start prod background loader loop (default `1`).                                        |
| `AUTO_UPGRADE_ON_BOOT`                | no       | If `1`, `create_app()` re-runs `flask db upgrade`. Off; `bin/start migrate` already does this.                     |
| `SENTRY_DSN`                          | no       | Enables backend Sentry. Blank/unset disables. See [DEVELOPMENT.md §7](./DEVELOPMENT.md#7-error-monitoring-sentry). |
| `SENTRY_ENVIRONMENT`                  | no       | Sentry environment label (defaults to `FLASK_ENV`).                                                                |
| `SENTRY_TRACES_SAMPLE_RATE`           | no       | Performance traces sample rate (default `0.1` in prod).                                                            |

### DNS / custom domain

```bash
flyctl certs create transit-explorer.org
# Then add the AAAA + A records flyctl prints to your DNS provider.
flyctl certs check transit-explorer.org
```

### Deploys after the first

`.github/workflows/fly-deploy.yml` runs `pytest`, builds the image, deploys
with `--strategy immediate --ha=false --detach`, then polls `/api/health`
until it returns 200. Pushes to `main` that touch `app/`, `requirements.txt`,
`Dockerfile`, `fly.toml`, or `bin/start` trigger the workflow (`gunicorn_startup.sh` is also watched as a backwards-compat shim).

CI also runs `flask db upgrade && flask data check-schema` against an
in-memory SQLite to catch any model ↔ migration drift before deploy.

You can also deploy manually:

```bash
flyctl deploy --local-only --ha=false --strategy immediate
```

### Process scaling

`fly.toml` declares a single process group:

```toml
[processes]
  app = 'prod'   # appended as args to the Dockerfile ENTRYPOINT (/app/bin/start)
```

`bin/start prod` runs migrations, then spawns `flask data load --loop` as a
background child (logs to `/tmp/te-loader.log`), then exec's gunicorn with
`--preload`. The loader refreshes OBA data on a TTL loop
(`OBA_REFRESH_TTL_HOURS`, default 24h).

We used to run a separate `worker` process group, but Fly volumes are
**single-attach** — only one machine can mount `tm_data` at a time, so the
worker machine could never see the DB. The in-process loader replaces it.

Keep the app at exactly **one machine** — the loader assumes a single writer:

```bash
flyctl scale count app=1 --region sjc -a transit-explorer
```

Do not scale beyond `app=1` without first migrating off SQLite. Set
`RUN_INPROC_LOADER=0` (e.g. via `flyctl secrets set` or `[env]`) if you ever
need to run gunicorn without the loader for debugging.

## 2. Frontend: Vercel

### Prerequisites

- A Vercel account with a project pointing at this repo.
- Set the **Root Directory** to `tm-frontend`.
- Set the **Build Command** to `npm run build` and **Output Directory** to
  `dist`.

### Required environment variables

Set all of these in Vercel → Project → Settings → Environment Variables:

| Var                                 | Notes                                                                            |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL`                 | `https://transit-explorer.fly.dev`                                               |
| `VITE_FIREBASE_API_KEY`             | From Firebase console.                                                           |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `<project>.firebaseapp.com`                                                      |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID.                                                             |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `<project>.appspot.com`                                                          |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console.                                                           |
| `VITE_FIREBASE_APP_ID`              | From Firebase console.                                                           |
| `VITE_SENTRY_DSN`                   | Optional. Enables browser Sentry.                                                |
| `VITE_SENTRY_ENVIRONMENT`           | Optional. e.g. `production` / `preview`.                                         |
| `VITE_SENTRY_TRACES_SAMPLE_RATE`    | Optional. Default `0.1`.                                                         |
| `SENTRY_AUTH_TOKEN`                 | Build-time only (Production + Preview); mark **Sensitive**. Uploads source maps. |
| `SENTRY_ORG`                        | Build-time. `transit-explorer`.                                                  |
| `SENTRY_PROJECT`                    | Build-time. `transit-explorer-frontend`.                                         |

If any `VITE_FIREBASE_*` value is missing, the app throws on first load —
this is intentional, so misconfiguration is immediately visible.

Sentry is optional: with `VITE_SENTRY_DSN` unset the client init is a no-op,
and without `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` the build
still succeeds (no source-map upload). See
[DEVELOPMENT.md §7](./DEVELOPMENT.md#7-error-monitoring-sentry) for the full
Sentry setup.

### Custom domain

Add the production domain in Vercel → Domains and follow the DNS
instructions. Then add it to `ALLOWED_ORIGINS` on the backend.

## 3. Firebase

1. Firebase console → **Authentication → Sign-in method** → enable Google.
2. **Authentication → Settings → Authorized domains** → add the production
   frontend domain.
3. **Project settings → Service accounts** → generate a new private key →
   paste the JSON into the Fly secret `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

## 4. Post-deploy verification

```bash
curl https://transit-explorer.fly.dev/api/health
# {
#   "status":"ok",
#   "routes_loaded": N,
#   "last_data_load_at":"...",
#   "last_data_load_error": null,
#   "agencies": [{"agency_id":"...","route_count":...,"last_success_at":"..."}, ...]
# }
#
# Or, on the box:
#   flyctl ssh console -C "flask data status" -a transit-explorer

# Auth must be required on writes:
curl -X POST https://transit-explorer.fly.dev/api/me/segments
# Expect 401

# Open the production site, sign in with Google, mark a segment, refresh.
```

## 5. Backups

`backup.sh` ships SQLite snapshots off the Fly volume to a configured
destination. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#backups-and-restore)
for restore procedures.
