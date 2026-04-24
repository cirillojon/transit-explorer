// Sentry initialization for the React frontend.
//
// Loaded once at app entry (main.jsx) BEFORE rendering. No-op if
// VITE_SENTRY_DSN is unset, so local dev without a DSN keeps working.
//
// Env vars (set in .env / Vercel project settings):
//   VITE_SENTRY_DSN              — DSN from the frontend project
//   VITE_SENTRY_ENVIRONMENT      — e.g. "production", "preview", "development"
//   VITE_SENTRY_RELEASE          — usually injected by Vercel (VERCEL_GIT_COMMIT_SHA)
//   VITE_SENTRY_TRACES_SAMPLE_RATE   — float, default 0.1 in prod / 0 in dev
//   VITE_SENTRY_REPLAYS_SESSION_RATE — default 0.0 (replay only on errors)
//   VITE_SENTRY_REPLAYS_ERROR_RATE   — default 1.0

import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info("VITE_SENTRY_DSN not set — Sentry disabled.");
    }
    return;
  }

  const env =
    import.meta.env.VITE_SENTRY_ENVIRONMENT ||
    (import.meta.env.PROD ? "production" : "development");

  const tracesRate = parseFloat(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ??
      (import.meta.env.PROD ? "0.1" : "0"),
  );
  const replaySessionRate = parseFloat(
    import.meta.env.VITE_SENTRY_REPLAYS_SESSION_RATE ?? "0",
  );
  const replayErrorRate = parseFloat(
    import.meta.env.VITE_SENTRY_REPLAYS_ERROR_RATE ?? "1.0",
  );

  Sentry.init({
    dsn,
    environment: env,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: Number.isFinite(tracesRate) ? tracesRate : 0.1,
    replaysSessionSampleRate: Number.isFinite(replaySessionRate)
      ? replaySessionRate
      : 0,
    replaysOnErrorSampleRate: Number.isFinite(replayErrorRate)
      ? replayErrorRate
      : 1.0,
    // Don't send PII by default; we manually attach Firebase UID.
    sendDefaultPii: false,
  });
}

/** Attach the signed-in Firebase user (or clear on sign-out). */
export function setSentryUser(firebaseUser) {
  if (!firebaseUser) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: firebaseUser.uid,
    email: firebaseUser.email || undefined,
    username: firebaseUser.displayName || undefined,
  });
}
