# Contributing to Transit Explorer

Thanks for considering a contribution! This document covers how to get a
local copy running and the workflow for getting changes merged.

## Prerequisites

- **Python 3.11+** (3.11.x is what production runs)
- **Node 22+** (Node 20.19+ also works)
- An [OneBusAway API key](https://onebusaway.org/contact/)
- A Firebase project with **Google sign-in enabled**, plus a downloaded
  service-account JSON for the Admin SDK

## First-time setup

```bash
git clone https://github.com/cirillojon/transit-explorer.git
cd transit-explorer
```

### Backend

```bash
# 1. Create env files
cp .env.example .env                          # then edit
# Drop your Firebase service-account JSON next to .env as service-account.json

# 2. (Option A) Docker
./dev_container_update.sh 8880                # → http://localhost:8880

# 2. (Option B) Pure Python — for fast iteration
python -m venv .venv
source .venv/bin/activate                     # Windows: .venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
flask --app app db upgrade                    # apply migrations
flask --app app run --port 8880
```

The first time you boot the backend via `bin/start dev` (or the Docker
helper), it kicks off a background OneBusAway preload that takes 1–3
minutes — the route list will populate as the loader catches up. Pure
`flask run` does not auto-seed; use `bin/start dev` or run
`flask data load` manually. Set `SKIP_DATA_LOAD=1` to skip the auto-seed
(e.g. when running tests).

### Frontend

```bash
cd tm-frontend
cp .env.example .env                          # fill in VITE_FIREBASE_* values
npm install
npm run dev                                   # → http://localhost:5173
```

## Running tests

| Suite             | Command                                                          |
| ----------------- | ---------------------------------------------------------------- |
| Backend (pytest)  | `pytest tests/ -q` (from repo root, with backend deps installed) |
| Frontend (vitest) | `cd tm-frontend && npm test`                                     |
| Frontend lint     | `cd tm-frontend && npm run lint`                                 |
| Frontend build    | `cd tm-frontend && npm run build`                                |

CI runs all four on every PR (`.github/workflows/ci.yml`). Deploys are
gated on backend tests passing.

### Writing new tests

- **Backend**: drop a `tests/test_*.py` file. Use the `app`, `client`, and
  `auth_headers` fixtures from `tests/conftest.py`. Firebase verification is
  monkey-patched so no real auth is required.
- **Frontend**: drop a `src/test/*.test.{js,jsx}` file. The setup at
  `src/test/setup.js` stubs Firebase and Vite env vars.

## Branch workflow

- `main` — always deployable. Pushes auto-deploy to Fly + Vercel.
- Feature branches — `feature/<short-name>` or `fix/<short-name>`.
- Open a PR against `main`. CI must be green before merge.
- Squash-merge unless a clean linear history is needed.

## Code style

- Backend: keep changes minimal and readable. No new dependencies without a
  reason. Prefer `db.session.get(Model, id)` over `Model.query.get(id)`
  (SQLAlchemy 2.0 style).
- Frontend: ESLint rules are non-negotiable in CI. `console.*` is allowed
  only as `warn`/`error` and is stripped from production builds. Always
  add `alt` text to `<img>` and `aria-label` to icon-only buttons.
- New API routes that accept user IDs or strings **must** validate via
  `app/validators.py`. Sensitive write endpoints **must** be rate-limited
  with `@limiter.limit(...)`.

## Reporting issues

Open an issue on GitHub with:

- What you tried, what happened, what you expected.
- Browser + OS for frontend issues.
- Last few lines of `flyctl logs` for backend issues.
- Whether you're hitting production (`transit-explorer.fly.dev`) or local.
