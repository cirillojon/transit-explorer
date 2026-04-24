"""JSON-structured logging for the Flask backend.

Why JSON: Fly's log shipper (and any downstream like Loki/Datadog/CW)
indexes structured fields automatically. The default key=value format
forces grep-archaeology and loses field types.

Toggle with `LOG_FORMAT=json` (the default in production via bin/start)
or `LOG_FORMAT=text` for local development. We do NOT replace the root
formatter when text mode is selected, so existing devs see no change.

Adds two automatic fields to every record (best-effort, only inside a
request context):
  - request_id: the `X-Request-ID` (echoed back on the response) so a
    log line can be correlated end-to-end across nginx → gunicorn → app.
  - firebase_uid: stable principal id when the request is authenticated.
"""
from __future__ import annotations

import logging
import os
import sys

try:  # optional dep — fall back to plain text if missing
    from pythonjsonlogger import jsonlogger
    _HAS_JSON_LOGGER = True
except ImportError:  # pragma: no cover
    _HAS_JSON_LOGGER = False


class _RequestContextFilter(logging.Filter):
    """Inject Flask `g.request_id` / `g.firebase_uid` into every record."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Imported lazily so this module can be imported before Flask is
        # available (e.g. during pytest collection of unrelated modules).
        try:
            from flask import g, has_request_context
        except ImportError:  # pragma: no cover
            return True
        if has_request_context():
            record.request_id = getattr(g, "request_id", None)
            record.firebase_uid = getattr(g, "firebase_uid", None)
        else:
            record.request_id = None
            record.firebase_uid = None
        return True


def configure_logging() -> None:
    """Idempotent root-logger setup. Safe to call multiple times.

    Reads:
      LOG_LEVEL   (DEBUG|INFO|WARNING|ERROR; default INFO)
      LOG_FORMAT  (json|text; default text)
    """
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    fmt = os.getenv("LOG_FORMAT", "text").lower()

    root = logging.getLogger()
    # Remove handlers we've installed previously so reconfiguration in
    # tests / `flask shell` doesn't double-emit lines.
    for h in list(root.handlers):
        if getattr(h, "_te_managed", False):
            root.removeHandler(h)

    handler = logging.StreamHandler(sys.stdout)
    handler._te_managed = True  # type: ignore[attr-defined]
    handler.addFilter(_RequestContextFilter())

    if fmt == "json" and _HAS_JSON_LOGGER:
        # Field renames keep us compatible with most log shippers'
        # default field assumptions (`message`, `level`, `time`).
        formatter = jsonlogger.JsonFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s "
            "%(request_id)s %(firebase_uid)s",
            rename_fields={"asctime": "time", "levelname": "level"},
        )
    else:
        formatter = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s "
            "[req=%(request_id)s uid=%(firebase_uid)s]: %(message)s"
        )
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(level)
