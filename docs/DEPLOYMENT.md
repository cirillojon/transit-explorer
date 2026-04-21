# Deployment Guide

End-to-end checklist for deploying Transit Explorer from a fresh repo to a
working production stack.

## Architecture recap

| Component | Host       | Notes                                               |
| --------- | ---------- | --------------------------------------------------- |
| Backend   | Fly.io     | Single machine + mounted SQLite volume (`tm_data`). |
| Frontend  | Vercel     | Static SPA from `tm-frontend/`.                     |
| Auth      | Firebase   | Google sign-in only.                                |
| Data      | OneBusAway | Pulled at startup + refreshed by background loader. |

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

| Secret                                | Required | Purpose                                                      |
| ------------------------------------- | -------- | ------------------------------------------------------------ |
| `OBA_API_KEY`                         | yes      | OneBusAway data fetches.                                     |
| `FIREBASE_PROJECT_ID`                 | yes      | Verifies Firebase ID tokens.                                 |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | yes      | Firebase Admin SDK credentials (JSON content, not path).     |
| `ALLOWED_ORIGINS`                     | yes      | Comma-separated CORS allowlist; **must be set** in prod.     |
| `RATELIMIT_STORAGE_URI`               | no       | Redis URL for cross-worker rate limits. Default per-process. |
| `SQLALCHEMY_DATABASE_URI`             | no       | Defaults to SQLite on the mounted volume.                    |

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
`Dockerfile`, `fly.toml`, or `gunicorn_startup.sh` trigger the workflow.

You can also deploy manually:

```bash
flyctl deploy --local-only --ha=false --strategy immediate
```

## 2. Frontend: Vercel

### Prerequisites

- A Vercel account with a project pointing at this repo.
- Set the **Root Directory** to `tm-frontend`.
- Set the **Build Command** to `npm run build` and **Output Directory** to
  `dist`.

### Required environment variables

Set all of these in Vercel → Project → Settings → Environment Variables:

| Var                                 | Notes                              |
| ----------------------------------- | ---------------------------------- |
| `VITE_API_BASE_URL`                 | `https://transit-explorer.fly.dev` |
| `VITE_FIREBASE_API_KEY`             | From Firebase console.             |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `<project>.firebaseapp.com`        |
| `VITE_FIREBASE_PROJECT_ID`          | Firebase project ID.               |
| `VITE_FIREBASE_STORAGE_BUCKET`      | `<project>.appspot.com`            |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From Firebase console.             |
| `VITE_FIREBASE_APP_ID`              | From Firebase console.             |

If any `VITE_FIREBASE_*` value is missing, the app throws on first load —
this is intentional, so misconfiguration is immediately visible.

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
# {"status":"ok","routes_loaded":N,"last_data_load_at":"...","time":"..."}

# Auth must be required on writes:
curl -X POST https://transit-explorer.fly.dev/api/segments
# Expect 401

# Open the production site, sign in with Google, mark a segment, refresh.
```

## 5. Backups

`backup.sh` ships SQLite snapshots off the Fly volume to a configured
destination. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#backups-and-restore)
for restore procedures.
