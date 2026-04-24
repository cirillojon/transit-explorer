"""Sentry initialization for the Flask backend.

Kept in its own module so create_app() stays small and so tests can
import the app without touching network/SDK state when SENTRY_DSN is
unset (the init is a no-op in that case).

Env vars:
  SENTRY_DSN              — required to enable; leave blank to disable.
  SENTRY_ENVIRONMENT      — e.g. "production", "development". Defaults
                            to FLASK_ENV or "development".
  SENTRY_RELEASE          — optional release identifier (git sha).
  SENTRY_TRACES_SAMPLE_RATE — float 0.0–1.0. Default 0.1 in prod, 0 elsewhere.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def init_sentry() -> bool:
    """Initialize Sentry if SENTRY_DSN is set. Returns True if initialized."""
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        logger.info("SENTRY_DSN not set — Sentry disabled.")
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
    except ImportError:
        logger.warning("sentry-sdk not installed — Sentry disabled.")
        return False

    env = os.getenv("SENTRY_ENVIRONMENT") or os.getenv("FLASK_ENV") or "development"
    release = os.getenv("SENTRY_RELEASE") or None

    default_traces = 0.1 if env == "production" else 0.0
    try:
        traces_rate = float(os.getenv("SENTRY_TRACES_SAMPLE_RATE", default_traces))
    except ValueError:
        traces_rate = default_traces

    sentry_sdk.init(
        dsn=dsn,
        environment=env,
        release=release,
        integrations=[
            FlaskIntegration(),
            SqlalchemyIntegration(),
            # Send WARNING+ logs as breadcrumbs, ERROR+ as events.
            LoggingIntegration(level=logging.INFO, event_level=logging.ERROR),
        ],
        traces_sample_rate=traces_rate,
        send_default_pii=False,
        # We attach Firebase UID manually in auth.py — no PII leakage.
    )
    logger.info(
        "Sentry initialized (env=%s, traces_sample_rate=%s, release=%s)",
        env, traces_rate, release or "<unset>",
    )
    return True


def set_sentry_user(firebase_uid: str | None, email: str | None = None) -> None:
    """Attach the current user to outgoing Sentry events for this scope.

    `email` parameter is accepted for backwards compatibility but is
    intentionally ignored to keep PII out of error reports.
    """
    try:
        import sentry_sdk
    except ImportError:
        return
    if not firebase_uid:
        sentry_sdk.set_user(None)
        return
    sentry_sdk.set_user({"id": firebase_uid})
