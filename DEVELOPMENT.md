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

# Backend
cp .env.example .env                      # then fill in values
#   Drop your Firebase service-account.json next to .env
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -r requirements.txt
FLASK_APP=app.py flask db upgrade

# Frontend
cd tm-frontend
cp .env.example .env                      # then fill in values
npm install
cd ..
```

### Daily loop

Open two terminals:

```bash
# Terminal 1 — backend
cd transit-explorer
source .venv/bin/activate
FLASK_APP=app.py FLASK_DEBUG=1 flask run --port 8880
```

```bash
# Terminal 2 — frontend
cd transit-explorer/tm-frontend
npm run dev
```

- Backend: http://localhost:8880
- Frontend: http://localhost:5173 (Vite proxies `/api` to backend via `VITE_PROXY_URL`)

### Common tasks

| Task                                 | Command                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| Reset local DB                       | `rm -rf tm-instance/*.db && flask db upgrade`               |
| Re-run OBA data load                 | Delete the DB, restart backend. Loader runs in background.  |
| Add a model field → migration        | `flask db migrate -m "describe change" && flask db upgrade` |
| Run backend tests                    | `pytest tests/`                                             |
| Frontend lint                        | `cd tm-frontend && npm run lint`                            |
| Frontend production-build smoke test | `cd tm-frontend && npm run build && npm run preview`        |

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

**Backend deploys are automatic via GitHub Actions.** Pushing to `main` with changes under `app/`, `requirements.txt`, `Dockerfile`, `fly.toml`, or `gunicorn_startup.sh` triggers [.github/workflows/fly-deploy.yml](.github/workflows/fly-deploy.yml), which runs `flyctl deploy --remote-only --ha=false` against the app. Frontend-only commits skip the workflow (path filter).

Watch a run: https://github.com/cirillojon/transit-explorer/actions

You can also trigger a deploy manually:

- **From GitHub:** Actions tab → Fly Deploy → Run workflow
- **From your laptop** (e.g. testing an unmerged branch):
  ```bash
  cd transit-explorer
  flyctl deploy --remote-only --ha=false
  ```

`--remote-only` builds on Fly's Depot builder so you don't need local Docker.
`--ha=false` keeps the single-machine cost-saving setup; remove it later if you scale to >1 machine.

Deploy is rolling: Fly stops the old machine, starts the new one, runs the healthcheck on `/api/health`, and only routes traffic when it passes. Total downtime: ~5–10 seconds.

### Rotating the deploy token

The workflow authenticates with a Fly deploy token stored in the GitHub repo secret `FLY_API_TOKEN`. To rotate:

```bash
flyctl tokens create deploy -a transit-explorer --expiry 8760h
# → copy output, paste into GitHub → Settings → Secrets and variables → Actions → FLY_API_TOKEN
flyctl tokens revoke <old-token-id>     # optional cleanup; list with `flyctl tokens list`
```

### What happens on boot

1. `gunicorn_startup.sh` runs, materializes `GOOGLE_APPLICATION_CREDENTIALS_JSON` to `/app/service-account.json`.
2. `flask db upgrade` applies any pending migrations (skip with `SKIP_DB_UPGRADE=1`).
3. Gunicorn forks `WEB_CONCURRENCY` workers with `--preload`.
4. App factory kicks off OBA data load in a **background thread** — `/api/health` responds immediately, but `/api/routes` returns increasing data over the next ~60s.

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

- **Healthcheck failing after deploy:** `flyctl logs` and look for the error. If the OBA load is the culprit, give it more time (`grace_period` in `fly.toml`) or set `SKIP_DATA_LOAD=1` and run the loader manually via `flyctl ssh console`.
- **OOM (Out Of Memory):** `flyctl scale memory 2048 -a transit-explorer`.
- **DB locked / migration errors:** SSH in, run `sqlite3 /app/tm-instance/data.db ".timeout 5000"` to diagnose. Worst case, restore from backup (see §6).
- **Need to rebuild image without code changes:** `flyctl deploy --remote-only --ha=false --no-cache`.

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
# 6. Deploy backend (gunicorn_startup.sh runs `flask db upgrade` on boot):
flyctl deploy --remote-only --ha=false
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

## 7. Useful URLs

| What                     | URL                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| Production frontend      | https://transit-explorer-ten.vercel.app                                                    |
| Production backend       | https://transit-explorer.fly.dev                                                           |
| Backend health check     | https://transit-explorer.fly.dev/api/health                                                |
| Fly app dashboard        | https://fly.io/apps/transit-explorer                                                       |
| Fly metrics              | https://fly.io/apps/transit-explorer/metrics                                               |
| Vercel project dashboard | https://vercel.com/dashboard (find `transit-explorer`)                                     |
| Firebase Auth settings   | https://console.firebase.google.com/project/transit-explorer-55b66/authentication/settings |
| OneBusAway API console   | https://api.pugetsound.onebusaway.org/                                                     |
| GitHub repo              | https://github.com/cirillojon/transit-explorer                                             |

---

## 8. Quick reference cheat sheet

```bash
# Local dev
flask run --port 8880          # backend
npm --prefix tm-frontend run dev   # frontend

# Deploy
git push origin main           # auto-deploys backend (if app/ changed) AND frontend
flyctl deploy --remote-only --ha=false   # manual backend deploy from a branch

# Logs / debugging
flyctl logs -a transit-explorer
flyctl ssh console -a transit-explorer

# Update prod env / secret
flyctl secrets set KEY=value -a transit-explorer

# Example local deploy comand from powershell:
wsl -e bash -lc "cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer && /home/jon/.fly/bin/flyctl deploy --remote-only --ha=false"

# Example console connect from powershell:
wsl -e bash -lc "cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer && /home/jon/.fly/bin/flyctl ssh console -a transit-explorer"

# Example check logs from powershell:
wsl -e bash -lc "cd /mnt/c/Users/Jonat/projects/tm-project-folder/transit-explorer && /home/jon/.fly/bin/flyctl logs -a transit-explorer"

# View releases from powershell:
wsl -e bash -lc "/home/jon/.fly/bin/flyctl releases -a transit-explorer"
```
