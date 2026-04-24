# Development & Deployment Workflow

Day-to-day guide for working on Transit Explorer.

> Live URLs:
>
> - **Frontend** — https://transit-explorer-ten.vercel.app (Vercel)
> - **Backend** — https://transit-explorer.fly.dev (Fly.io app `transit-explorer`, region `sjc`)
> - **Auth** — Firebase project `transit-explorer-55b66`

---

## 1. Local development

### One-time setup

```bash
git clone https://github.com/cirillojon/transit-explorer.git
cd transit-explorer

# Backend config shared by both workflows
cp .env.example .env                      # then fill in values
#   Drop your Firebase service-account.json next to .env

# Pick one backend workflow below.

# Docker helper
./dev_container_update.sh 8880

# Alternative: local Python environment
python3 -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# `bin/start dev` handles migrations + auto-seed for you (see Daily loop).

# Frontend
cd tm-frontend
cp .env.example .env                      # then fill in values
npm install
cd ..
```

### Daily loop

Open two terminals. For the backend terminal, pick one option:

```bash
# Terminal 1 — backend
cd transit-explorer
./dev_container_update.sh 8880
```

```bash
# Terminal 1 alternative — backend without Docker
cd transit-explorer
source .venv/bin/activate
./bin/start dev     # runs migrations, seeds OBA data if DB is empty, starts flask run
```

```bash
# Terminal 2 — frontend
cd transit-explorer/tm-frontend
npm run dev
```

- Backend: http://localhost:8880
- Frontend: http://localhost:5173 (Vite proxies `/api` to backend via `VITE_PROXY_URL`)

On a fresh local DB, `bin/start dev` kicks off a background OBA load. `/api/health` reports per-agency progress (`agencies[].route_count`, `last_data_load_at`); give `/api/routes` and route detail 1-3 minutes to fully populate. Re-running `bin/start dev` is safe — it skips the seed when the `routes` table is non-empty.

`bin/start` modes:

| Mode        | Purpose                                                                                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`       | migrate + auto-seed (background) + `flask run --debug` on `PORT` (default 8880).                                                                                    |
| `prod`      | migrate + `gunicorn` + background `flask data load --loop` (Fly's `app` process).                                                                                   |
| `worker`    | `flask data load --loop` — standalone refresh loop (used for local rehearsal; Fly no longer runs this as a separate machine, the loop is in-process inside `prod`). |
| `migrate`   | `flask db upgrade && flask data check-schema`. Exits 0 on success.                                                                                                  |
| `load-data` | One-shot `flask data load` (add `--force` to ignore TTL).                                                                                                           |

A file lock at `$DATA_DIR/.boot.lock` (default `tm-instance/.boot.lock`) serializes the migrate step so concurrent boots don't race.

If you use `./dev_container_update.sh`, it rebuilds the image and replaces the existing local backend container for the current git branch. On Windows, run it from WSL or Git Bash.

### Common tasks

| Task                                    | Command                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Rebuild/restart local backend container | `./dev_container_update.sh 8880`                                              |
| Reset local DB                          | `rm -rf tm-instance/*.db && ./bin/start dev` (auto-migrates + auto-seeds)     |
| Re-run OBA data load                    | `flask data load --force` (or `./bin/start load-data --force`)                |
| Inspect data-load state                 | `flask data status` — JSON of per-agency last attempt/success/route count     |
| Detect model ↔ migration drift          | `flask data check-schema` (also runs in CI and on every boot via `bin/start`) |
| Add a model field → migration           | `flask db migrate -m "describe change"` then commit; boot applies it          |
| Run backend tests                       | `pytest tests/`                                                               |
| Frontend lint                           | `cd tm-frontend && npm run lint`                                              |
| Frontend production-build smoke test    | `cd tm-frontend && npm run build && npm run preview`                          |

---

## 2. Branching & code review

We use **GitHub flow** — short-lived feature branches off `main`.

```bash
git checkout main
git pull
git checkout -b feature/my-thing

# … make changes, commit …

git push -u origin feature/my-thing
# → open PR on GitHub, merge to main when green
```

- **Vercel** auto-deploys every PR to a preview URL — see the PR check or the Vercel dashboard.
- **Fly.io** auto-deploys when backend files change on `main` (see §4). PRs do _not_ deploy to Fly — only merges to `main`.

**Commit hygiene:** rebase or squash before merge so `main` history is clean. Avoid committing `.env`, `service-account.json`, `*.db`, `node_modules/`, `tm-instance/`. (`.gitignore` covers them, but double-check `git status` before pushing.)

---

## 3. Deploying frontend changes (Vercel)

**Frontend deploys are automatic.**

1. Merge to `main` (or push to a PR branch for a preview).
2. Vercel detects the push, runs `npm install && npm run build` from `tm-frontend/`, and deploys.
3. Production URL updates within ~90 seconds. Preview URLs are unique per commit.

### When something goes wrong

- **Build fails:** open https://vercel.com/dashboard → project → Deployments → click the failed deploy → check logs.
- **Built but blank page in production:** open the deployed page, check the browser console. Usual culprit is a missing `VITE_*` env var.
  - Vercel → Project Settings → Environment Variables → confirm all keys are set for **Production**.
  - Re-deploy: Deployments → ⋯ → "Redeploy" (env var changes don't auto-trigger).
- **CORS errors:** the backend's `ALLOWED_ORIGINS` doesn't include the new domain. Run:
  ```bash
  flyctl secrets set ALLOWED_ORIGINS="https://transit-explorer-ten.vercel.app,https://your-new-domain.com" -a transit-explorer
  ```
- **Auth popup says "domain not authorized":** Firebase Console → Authentication → Settings → Authorized domains → add the domain.

### Adding a custom domain

1. Vercel → Project → Settings → Domains → add (e.g. `app.example.com`). Follow the DNS instructions.
2. Once Vercel says "Valid Configuration":
   ```bash
   flyctl secrets set ALLOWED_ORIGINS="https://app.example.com,https://transit-explorer-ten.vercel.app" -a transit-explorer
   ```
3. Firebase Console → add `app.example.com` to Authorized domains.

---

## 4. Deploying backend changes (Fly.io)

**Backend deploys are automatic via GitHub Actions.** Pushing to `main` with changes under `app/`, `requirements.txt`, `Dockerfile`, `fly.toml`, `bin/start`, or `.dockerignore` triggers [.github/workflows/fly-deploy.yml](.github/workflows/fly-deploy.yml). The workflow runs `flyctl deploy --local-only --ha=false --strategy immediate --detach`, then polls `/api/health` until the app is back.

Watch a run: https://github.com/cirillojon/transit-explorer/actions

You can also trigger a deploy manually:

- **From GitHub:** Actions tab → Fly Deploy → Run workflow
- **From your laptop** (e.g. testing an unmerged branch):
  ```bash
  cd transit-explorer
  flyctl deploy --remote-only --ha=false --strategy immediate
  ```

`--remote-only` builds on Fly's Depot builder so you don't need local Docker.
`--ha=false` keeps the single-machine cost-saving setup; remove it later if you scale to >1 machine.
`--strategy immediate` matches the live app's single-volume deployment model.

Deploy is **not** rolling. The live app uses one machine plus one mounted volume, so Fly has to stop the old machine before starting the new one. Expect a short hard cutover, then a warm-up period where `/api/health` comes back first and route data continues loading/backfilling in the background.

### Rotating the deploy token

The workflow authenticates with a Fly deploy token stored in the GitHub repo secret `FLY_API_TOKEN`. To rotate:

```bash
flyctl tokens create deploy -a transit-explorer --expiry 8760h
# → copy output, paste into GitHub → Settings → Secrets and variables → Actions → FLY_API_TOKEN
flyctl tokens revoke <old-token-id>     # optional cleanup; list with `flyctl tokens list`
```

### What happens on boot

Fly runs a single process from `fly.toml` (`[processes]`):

- **`app` = `bin/start prod`** — materializes `GOOGLE_APPLICATION_CREDENTIALS_JSON` if present, takes the `$DATA_DIR/.boot.lock` (`flock`), runs `flask db upgrade` + `flask data check-schema`, kicks off the in-process loader loop (`flask data load --loop`, output to `/tmp/te-loader.log`), then exec's gunicorn with `--preload`. Fails fast if migrations or schema-drift fail. Set `RUN_INPROC_LOADER=0` to disable the loop (e.g. for debugging).

The loader runs inside the same machine as gunicorn because Fly volumes are **single-attach** — only one machine can mount `tm_data` at a time. A previous design used a dedicated `worker` process group, but that worker machine could not mount the volume and silently never ran. Per-agency state lives in the `data_loads` table; refreshes are TTL-gated (default 24h via `OBA_REFRESH_TTL_HOURS`) and only re-fetch routes whose direction list is missing/incomplete (or everything if `--force`).

Scale stays at one machine:

```bash
flyctl scale count app=1 --region sjc -a transit-explorer
```

Do not scale beyond `app=1` without first migrating off SQLite — the volume is single-attach and the loader loop assumes a single writer.

Escape hatch: `AUTO_UPGRADE_ON_BOOT=1` lets `create_app()` re-run `flask db upgrade` from inside gunicorn (off by default; useful only if you ever bypass `bin/start`).

### Common backend tasks

| Task                                  | Command                                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tail logs                             | `flyctl logs -a transit-explorer`                                                                                                 |
| SSH into the VM                       | `flyctl ssh console -a transit-explorer`                                                                                          |
| List/inspect secrets                  | `flyctl secrets list -a transit-explorer`                                                                                         |
| Set/update a secret (triggers deploy) | `flyctl secrets set FOO=bar -a transit-explorer`                                                                                  |
| Status / machine state                | `flyctl status -a transit-explorer`                                                                                               |
| Manually restart                      | `flyctl machine restart <machine-id> -a transit-explorer`                                                                         |
| Bump RAM (e.g. OOM)                   | `flyctl scale memory 2048 -a transit-explorer`                                                                                    |
| Inspect SQLite on the volume          | `flyctl ssh console -C "sqlite3 /app/tm-instance/data.db .tables" -a transit-explorer`                                            |
| Force OBA refresh in prod             | `flyctl ssh console -C "flask data load --force" -a transit-explorer`                                                             |
| Tail in-process loader log in prod    | `flyctl ssh console -C "tail -f /tmp/te-loader.log" -a transit-explorer`                                                          |
| Inspect data-load state in prod       | `flyctl ssh console -C "flask data status" -a transit-explorer`                                                                   |
| Roll back a deploy                    | Find prior image: `flyctl releases -a transit-explorer`; redeploy: `flyctl deploy --image registry.fly.io/transit-explorer:<tag>` |

> **First-time SSH setup (Windows + WSL gotcha):** `flyctl ssh console` needs a personal SSH cert in your ssh-agent. PowerShell's `ssh-agent` service is disabled by default, so run the cert step **inside WSL** once per shell:
>
> ```bash
> wsl
> eval "$(ssh-agent -s)"
> flyctl ssh issue --org personal --agent
> flyctl ssh console -a transit-explorer
> ```
>
> The cert lasts 24 hours. After that just re-run the `eval` + `issue` two-liner.

### When something goes wrong

- **Healthcheck failing after deploy:** `flyctl logs` and look for the error. `/api/health` should come up within seconds of gunicorn booting (the in-process OBA loader runs in the background and doesn't block it); `fly.toml` still gives a 3-minute grace period and the GitHub workflow polls `/api/health` for up to 10 minutes as a safety margin.
- **OOM (Out Of Memory):** `flyctl scale memory 2048 -a transit-explorer`.
- **DB locked / migration errors:** SSH in, run `sqlite3 /app/tm-instance/data.db ".timeout 5000"` to diagnose. Worst case, restore from backup (see §6).
- **Need to rebuild image without code changes:** `flyctl deploy --remote-only --ha=false --strategy immediate --no-cache`.

### Adding a new env var or secret

1. Add it to `.env.example` so future devs know it exists.
2. Local: add to `.env`.
3. Production: `flyctl secrets set FOO=bar -a transit-explorer` (this triggers a redeploy automatically).
4. If it should be **non-secret** (visible in the dashboard, e.g. `LOG_LEVEL`), put it under `[env]` in `fly.toml` instead and `flyctl deploy`.

### Adding a new dependency

| What                    | Where                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Python package          | `requirements.txt` → `pip install -r requirements.txt` locally → `flyctl deploy`                      |
| Node package (frontend) | `cd tm-frontend && npm install <pkg>` → commit `package.json` + lockfile → push → Vercel auto-deploys |
| System (apt) package    | Edit `Dockerfile` apt-get line → `flyctl deploy`                                                      |

---

## 5. Database migrations

```bash
# 1. Modify a model in app/models.py
# 2. Generate migration locally:
FLASK_APP=app.py flask db migrate -m "add foo column to users"
# 3. Inspect the file in app/migrations/versions/ — Alembic isn't perfect.
# 4. Apply locally:
FLASK_APP=app.py flask db upgrade
# 5. Test, commit migration file with the model change.
git add app/migrations/versions/ app/models.py
git commit -m "Add foo column to users"
git push
# 6. Deploy backend (`bin/start prod` runs `flask db upgrade` on boot):
flyctl deploy --remote-only --ha=false --strategy immediate
```

**Rollback a migration:**

```bash
# Locally
FLASK_APP=app.py flask db downgrade -1

# In production (rare — usually safer to write a forward-fixing migration)
flyctl ssh console -C "FLASK_APP=app.py flask db downgrade -1" -a transit-explorer
```

---

## 6. Backups

Fly snapshots the volume daily (5-day retention by default — see `flyctl volumes show tm_data`).

For an extra layer of safety, `backup.sh` can take an online SQLite snapshot. To run it against the Fly machine:

```bash
flyctl ssh console -a transit-explorer -C \
  "sqlite3 /app/tm-instance/data.db \".backup /tmp/backup.db\""
flyctl ssh sftp get /tmp/backup.db ./backups/$(date +%Y%m%d-%H%M%S).db -a transit-explorer
```

**Restore:**

```bash
# Push the snapshot to the volume and swap it in
flyctl ssh sftp put ./backups/restore.db /tmp/restore.db -a transit-explorer
flyctl ssh console -a transit-explorer
# inside the VM:
mv /app/tm-instance/data.db /app/tm-instance/data.db.bak
mv /tmp/restore.db /app/tm-instance/data.db
exit
flyctl machine restart <machine-id> -a transit-explorer
```

---

## 7. Error monitoring (Sentry)

Both runtimes report to a single Sentry **organization** named `transit-explorer`, with one project per platform:

| Project                     | What it captures                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `transit-explorer-frontend` | Browser JS errors, React render errors (via `ErrorBoundary`), Session Replay, web vitals. |
| `transit-explorer-backend`  | Flask request errors, SQLAlchemy errors, ERROR-level log records.                         |

Both share dashboards, alerts, and the GitHub source-code integration (commit links + suspect commits + "Open in GitHub" on stack frames).

### Required env vars

**Backend** — set as Fly secrets:

```bash
flyctl secrets set \
  SENTRY_DSN="https://<key>@<id>.ingest.us.sentry.io/<project-id>" \
  SENTRY_ENVIRONMENT="production" \
  -a transit-explorer
# Optional:
#   SENTRY_RELEASE=<git-sha>           # tag events with the release
#   SENTRY_TRACES_SAMPLE_RATE=0.1      # default 0.1 in prod, 0 elsewhere
```

**Frontend (runtime)** — set in **Vercel → Project → Settings → Environment Variables** (all three environments: Production / Preview / Development):

```
VITE_SENTRY_DSN              = https://<key>@<id>.ingest.us.sentry.io/<project-id>
VITE_SENTRY_ENVIRONMENT      = production           (per-env: preview/development)
VITE_SENTRY_TRACES_SAMPLE_RATE = 0.1                (optional)
```

**Frontend (build-time, source map upload)** — also in Vercel project env, **only Production + Preview**, mark `SENTRY_AUTH_TOKEN` as **Sensitive**:

```
SENTRY_AUTH_TOKEN  = sntrys_…           (Sentry → Settings → Auth Tokens; scopes: project:releases, org:read)
SENTRY_ORG         = transit-explorer
SENTRY_PROJECT     = transit-explorer-frontend
```

When all three are present, `vite build` generates source maps, uploads them to Sentry, then deletes them from `dist/` so they aren't served publicly. Without them, the build still works (no upload, stack traces are minified).

### Verifying it works

```bash
# Backend smoke test (after deploy)
curl -s https://transit-explorer.fly.dev/api/__sentry-debug 2>/dev/null   # expect 404 if no debug route exists
flyctl ssh console -a transit-explorer -C 'python -c "import sentry_sdk; sentry_sdk.capture_message(\"backend smoke test\")"'

# Frontend: open the deployed site, in DevTools console run:
#   throw new Error("frontend smoke test")
# then check Sentry → Issues for both events.
```

If events don't show up, check Sentry → Settings → Projects → [project] → **Inbound Filters** (releases without source maps and certain user agents can be filtered).

### Source code integration

After installing the GitHub integration (Sentry → Settings → Integrations → GitHub) and adding code mappings per project:

- **Frontend** code mapping: stack root = (empty), source root = `tm-frontend/`, repo = `cirillojon/transit-explorer`, branch = `main`.
- **Backend** code mapping: stack root = `/app/`, source root = (empty), repo = `cirillojon/transit-explorer`, branch = `main`.

This unlocks "View on GitHub" on stack frames and "Suspect Commits" on issues.

---

## 8. Useful URLs

| What                     | URL                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Production frontend      | https://transit-explorer-ten.vercel.app                                                    |
| Production backend       | https://transit-explorer.fly.dev                                                           |
| Backend health check     | https://transit-explorer.fly.dev/api/health                                                |
| Fly app dashboard        | https://fly.io/apps/transit-explorer                                                       |
| Fly metrics              | https://fly.io/apps/transit-explorer/metrics                                               |
| Vercel project dashboard | https://vercel.com/dashboard (find `transit-explorer`)                                     |
| Sentry organization      | https://transit-explorer.sentry.io/                                                        |
| Firebase Auth settings   | https://console.firebase.google.com/project/transit-explorer-55b66/authentication/settings |
| OneBusAway API console   | https://api.pugetsound.onebusaway.org/                                                     |
| GitHub repo              | https://github.com/cirillojon/transit-explorer                                             |

---

## 9. Quick reference cheat sheet

Replace `<repo>` with the absolute path to your local clone (e.g. `~/projects/transit-explorer` on macOS/Linux, or the WSL path under `/mnt/c/...` on Windows). `flyctl` is assumed to be on `$PATH` (`~/.fly/bin/flyctl` if installed via the official script).

```bash
# Local dev
./dev_container_update.sh 8880     # backend with Docker
flask run --port 8880              # backend without Docker
npm --prefix tm-frontend run dev   # frontend

# Deploy
git push origin main               # auto-deploys backend (if backend paths changed) and frontend
flyctl deploy --remote-only --ha=false --strategy immediate   # manual backend deploy from a branch

# Logs / debugging
flyctl logs -a transit-explorer
flyctl ssh console -a transit-explorer

# Update prod env / secret
flyctl secrets set KEY=value -a transit-explorer
```

### From PowerShell (Windows) — wrap in `wsl -e bash -lc`

```powershell
# Manual deploy from a branch
wsl -e bash -lc "cd <repo> && flyctl deploy --remote-only --ha=false --strategy immediate"

# SSH console
wsl -e bash -lc "flyctl ssh console -a transit-explorer"

# Tail logs
wsl -e bash -lc "flyctl logs -a transit-explorer"

# View releases
wsl -e bash -lc "flyctl releases -a transit-explorer"

# Status / machine list
wsl -e bash -lc "flyctl status -a transit-explorer"
wsl -e bash -lc "flyctl machine list -a transit-explorer"
```

### SQLite on the production volume

```bash
# List tables (one-shot)
flyctl ssh console -a transit-explorer -C 'sqlite3 /app/tm-instance/data.db .tables'
# → alembic_version  route_stops  stops  users  route_directions  routes  user_segments

# Interactive REPL
flyctl ssh console -a transit-explorer
# inside the VM:
sqlite3 -header -column /app/tm-instance/data.db   # type SQL, .quit to exit
```

### Tests

```bash
# Backend
source .venv/bin/activate && pytest tests/ -q

# Frontend
npm --prefix tm-frontend test -- --run
```

### Snapshot production DB

```bash
# Take an online snapshot inside the VM, then SFTP it down
flyctl ssh console -a transit-explorer -C \
  'sqlite3 /app/tm-instance/data.db ".backup /tmp/prod-snapshot.db"'
flyctl ssh sftp get /tmp/prod-snapshot.db ./backups/prod-snapshot.db -a transit-explorer
```

### OBA data refresh

```bash
# Force a refresh in production
flyctl ssh console -a transit-explorer -C 'flask data load --force'

# Inspect data-load state
flyctl ssh console -a transit-explorer -C 'flask data status'

# Force locally
FLASK_APP=app.py flask data load --force
```

### Sentry smoke tests

```bash
# Backend — confirm SDK initialized at boot
flyctl logs -a transit-explorer | grep -i sentry
# → ... [INFO] app.observability: Sentry initialized (env=production, ...)

# Backend — send a test event
flyctl ssh console -a transit-explorer -C \
  'python -c "import sentry_sdk; sentry_sdk.init(dsn=__import__(\"os\").environ[\"SENTRY_DSN\"]); sentry_sdk.capture_message(\"backend smoke test\")"'
```

```js
// Frontend — paste into the deployed site's DevTools console

// 1. Confirm the SDK initialized with the right DSN
const s = window.__SENTRY__[window.__SENTRY__.version];
s.defaultCurrentScope.getClient()?.getDsn();

// 2. Send an explicit test event (works from console)
s.defaultCurrentScope
  .getClient()
  .captureException(new Error("manual sentry test " + Date.now()));

// 3. Async throw — exercises the global onerror handler too
setTimeout(() => {
  throw new Error("async sentry test " + Date.now());
}, 100);

// NOTE: `throw new Error(...)` typed directly into the console does NOT
// trigger Sentry — DevTools-thrown errors bypass window.onerror. Use the
// captureException or setTimeout patterns above to test from the console.
```
