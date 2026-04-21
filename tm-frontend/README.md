# tm-frontend

Transit Explorer web client — React + Vite SPA. Reads from the Flask
backend in `../app/` and authenticates users with Firebase Auth.

For the full project overview, see the [root README](../README.md).

## Setup

```bash
cd tm-frontend
cp .env.example .env       # then fill in VITE_FIREBASE_* values
npm install
npm run dev                # → http://localhost:5173
```

In dev, the Vite server proxies `/api/*` to `VITE_PROXY_URL`
(default `http://localhost:8880`). In production the SPA hits
`VITE_API_BASE_URL` directly.

## Scripts

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the Vite dev server with HMR.              |
| `npm run build`   | Production build into `dist/`.                   |
| `npm run preview` | Serve the built bundle locally for a smoke test. |
| `npm run lint`    | ESLint over `src/` (react, hooks, jsx-a11y).     |
| `npm test`        | Vitest suite (jsdom + React Testing Library).    |

## Environment variables

All vars are read at build time and baked into the bundle. They are **not**
secrets — protect access with Firebase Auth domain restrictions and
[App Check](https://firebase.google.com/docs/app-check), not by hiding the
keys.

| Var                                 | Required | Notes                                                      |
| ----------------------------------- | -------- | ---------------------------------------------------------- |
| `VITE_API_BASE_URL`                 | prod     | Full URL of deployed backend, e.g. `https://api…`.         |
| `VITE_PROXY_URL`                    | dev      | Target for the `/api` proxy, e.g. `http://localhost:8880`. |
| `VITE_FIREBASE_API_KEY`             | yes      | From Firebase console → Project settings → Web app.        |
| `VITE_FIREBASE_AUTH_DOMAIN`         | yes      | `<project>.firebaseapp.com`                                |
| `VITE_FIREBASE_PROJECT_ID`          | yes      | Firebase project ID.                                       |
| `VITE_FIREBASE_STORAGE_BUCKET`      | yes      | `<project>.appspot.com`                                    |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes      | Numeric sender ID.                                         |
| `VITE_FIREBASE_APP_ID`              | yes      | App ID like `1:123…:web:abc…`.                             |

`src/firebase.js` throws on boot if any of the `VITE_FIREBASE_*` values are
missing, so misconfiguration is loud and obvious.

## Deployment

The frontend is deployed to Vercel on every push to `main`. The Vercel
project's environment must include all `VITE_FIREBASE_*` vars and
`VITE_API_BASE_URL` pointing at the production backend
(`https://transit-explorer.fly.dev` by default).

## Tests

Vitest runs in jsdom with React Testing Library. Test files live under
`src/test/` and follow the `*.test.js` / `*.test.jsx` naming convention.

```bash
npm test            # one-off run
npm run test:watch  # watch mode for TDD
```

The test setup at `src/test/setup.js` mocks `firebase/app` and
`firebase/auth` so component tests never contact Google.
