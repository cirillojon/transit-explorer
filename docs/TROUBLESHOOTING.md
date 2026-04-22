# Troubleshooting

Common production issues and how to dig out of them. If something here is
out of date, fix it in the same PR as the underlying change.

## Quick triage

```bash
# 1. Is the backend up?
curl -i https://transit-explorer.fly.dev/api/health

# 2. What does Fly think?
flyctl status -a transit-explorer
flyctl logs   -a transit-explorer | tail -200

# 3. Has the data loader run lately?
curl -s https://transit-explorer.fly.dev/api/health | jq
# `last_data_load_at`, `last_data_load_error`, and `agencies[]` come from
# the `data_loads` table. For the canonical view:
#   flyctl ssh console -C "flask data status" -a transit-explorer
```

## Common errors

### `/api/health` returns 200 but `routes_loaded: 0`

The OneBusAway preload is still in flight, or it failed silently. Wait
1–3 minutes after a deploy. If it stays at 0:

```bash
flyctl logs -a transit-explorer | grep -iE 'oba|loader|429|timeout'
```

Likely causes:

- **Bad/expired `OBA_API_KEY`** — rotate via `flyctl secrets set OBA_API_KEY=…`.
- **OBA upstream 429s** — the loader retries with backoff; usually self-heals.
- **DB write failure** — check `last_data_load_error` on `/api/health` and
  scan logs for `SQLAlchemyError`.

### CORS errors in the browser

```
Access to XMLHttpRequest at 'https://transit-explorer.fly.dev/api/...' from
origin 'https://...' has been blocked by CORS policy
```

`ALLOWED_ORIGINS` doesn't include the calling origin. In non-`development`
mode the app **refuses to start** if `ALLOWED_ORIGINS` is empty. Fix:

```bash
flyctl secrets set \
  ALLOWED_ORIGINS="https://transit-explorer.org,https://your-vercel-preview.vercel.app"
```

Vercel preview deploys get fresh hostnames per branch — if you need them to
hit production, add the wildcard hostname or proxy through your custom
domain.

### `401 Unauthorized` on every write

- Frontend isn't sending a Firebase ID token. Open DevTools → Network →
  inspect the request: there should be `Authorization: Bearer eyJ…`. If
  not, the user isn't signed in or `auth.currentUser` is null.
- Token is signed by a project that doesn't match `FIREBASE_PROJECT_ID` on
  the backend.
- The token is missing a `uid` claim — only valid Firebase ID tokens are
  accepted; custom tokens or JWTs from other issuers are rejected.

### `429 Too Many Requests`

You hit the global rate limit (120/min) or an endpoint-specific limit
(`/api/segments` POST: 30/min, bulk delete: 10/min). The response payload:

```json
{ "error": "rate limit exceeded", "detail": "30 per 1 minute" }
```

For genuinely high-traffic deploys, set `RATELIMIT_STORAGE_URI` to Redis
so limits are global instead of per-worker, then scale `WEB_CONCURRENCY`.

### `flask db upgrade` fails on first boot

`bin/start migrate` (run automatically by both Fly processes) executes
`flask db upgrade` followed by `flask data check-schema`. If either step
exits non-zero, the process exits and Fly restarts it — deploys do **not**
silently fall back to `db.create_all()`. To investigate:

```bash
flyctl ssh console -a transit-explorer
cd /app
flask db current                  # which revision are we at?
flask db heads                    # which revision should we be at?
flask db upgrade                  # apply pending migrations
flask data check-schema           # surfaces model ↔ migration drift
```

The baseline migration is `app/migrations/versions/f838d5f10e83_baseline_schema.py`.
If the DB is ahead of the code (e.g. after a rollback), use
`flask db stamp <rev>` to realign before retrying `upgrade`.

### Background data loader stops updating

`/api/health.last_data_load_at` is hours old. The in-process loader loop
(spawned by `bin/start prod` alongside gunicorn) either crash-looped or is
rate-limited. Inspect it:

```bash
flyctl logs   -a transit-explorer
flyctl status -a transit-explorer
flyctl ssh console -C "tail -n 200 /tmp/te-loader.log" -a transit-explorer
flyctl ssh console -C "flask data status" -a transit-explorer
```

Force an immediate refresh:

```bash
flyctl ssh console -C "flask data load --force" -a transit-explorer
```

If the loader process is gone but gunicorn is still serving traffic, restart
the machine to respawn it:

```bash
flyctl machine restart <machine-id> -a transit-explorer
# or rescale (still single-machine — see DEPLOYMENT.md):
flyctl scale count app=1 --region sjc -a transit-explorer
```

To run gunicorn without the loader (e.g. while debugging an OBA-side issue),
set `RUN_INPROC_LOADER=0` via `flyctl secrets set` or `[env]`.

Refresh cadence is controlled by `OBA_REFRESH_TTL_HOURS` (default `24`).
Lowering it past a few hours will burn OBA quota with no benefit — their
data changes on a schedule-board cadence.

## Inspecting logs

```bash
# Tail live
flyctl logs -a transit-explorer

# Recent only
flyctl logs -a transit-explorer | tail -500

# Filter to errors
flyctl logs -a transit-explorer | grep -iE 'error|traceback|429|503'
```

Application logs go to stdout via Python `logging`. The 500 handler logs
full tracebacks; the response body to clients is the safe `{"error":
"internal server error"}` only.

## Backups and restore

`backup.sh` snapshots the SQLite DB off the Fly volume. To restore:

```bash
flyctl ssh console -a transit-explorer
cd /app/tm-instance

# Stop writes briefly:
sqlite3 data.db "PRAGMA wal_checkpoint(FULL);"

# Replace from a known-good snapshot:
mv data.db data.db.bad
cp /path/to/backup.db data.db

# Restart so SQLAlchemy re-opens the file:
exit
flyctl machine restart <machine-id> -a transit-explorer
```

Always make a copy of the bad DB before overwriting — don't `rm` it.

## Frontend stuck on a stale build

Vercel caches aggressively. Force a fresh deploy:

- Push an empty commit, or
- Vercel dashboard → Deployments → ⋯ → **Redeploy** without build cache.

Service-worker caching is **not** enabled, so a hard refresh
(Ctrl/Cmd + Shift + R) is enough on the user side.

## When all else fails

1. Capture: `flyctl status`, last 500 log lines, output of `/api/health`,
   browser console errors.
2. Open an issue with the above.
3. If production is fully down, redeploy the previous green commit:

   ```bash
   git checkout <last-good-sha>
   flyctl deploy --local-only --ha=false --strategy immediate
   ```
