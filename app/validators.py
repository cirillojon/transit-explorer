"""Lightweight request-payload validators.

Kept dependency-free so we don't pull in pydantic/marshmallow for a small
surface area. Each helper raises ValueError with a user-safe message on
invalid input; callers translate to a 400 JSON response.
"""
import re
from datetime import datetime, timezone, timedelta

# Stop / route / direction IDs in OneBusAway are typically of the form
# "<agency>_<id>" using ASCII alphanumerics, dashes, underscores, dots, colons.
_ID_RE = re.compile(r"^[A-Za-z0-9_\-\.:]{1,80}$")

MAX_NOTES_LEN = 500
MAX_BULK_IDS = 500
# Cap measured trip duration at 24h to keep the int small and reject
# obviously-bogus client clocks.
MAX_DURATION_MS = 24 * 60 * 60 * 1000
# Window for client-supplied completed_at backdating. ±24h covers
# yesterday-evening-rides logged the next morning while preventing
# leaderboard manipulation by stuffing arbitrary historical timestamps.
COMPLETED_AT_WINDOW = timedelta(hours=24)


def validate_id(value, field):
    if value is None or not isinstance(value, str):
        raise ValueError(f"{field} is required")
    v = value.strip()
    if not v:
        raise ValueError(f"{field} is required")
    if not _ID_RE.match(v):
        raise ValueError(f"{field} has invalid format")
    return v


def validate_direction_id(value, field="direction_id"):
    """OBA direction_ids are typically '0' or '1' but can be agency-specific
    short strings. Cap to short alphanumerics."""
    if value is None:
        raise ValueError(f"{field} is required")
    v = str(value).strip()
    if not v or len(v) > 16 or not re.match(r"^[A-Za-z0-9_\-]+$", v):
        raise ValueError(f"{field} has invalid format")
    return v


def validate_notes(value, field="notes"):
    v = (value or "")
    if not isinstance(v, str):
        raise ValueError(f"{field} must be a string")
    v = v.strip()
    if len(v) > MAX_NOTES_LEN:
        raise ValueError(f"{field} exceeds {MAX_NOTES_LEN} characters")
    return v


def validate_duration_ms(value, field="duration_ms", required=False):
    """Optional measured trip duration in milliseconds.

    Accepts None / missing (returns None) unless required=True. Rejects
    negative, non-numeric, or absurdly large values.
    """
    if value is None:
        if required:
            raise ValueError(f"{field} is required")
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{field} must be a number")
    iv = int(value)
    if iv < 0:
        raise ValueError(f"{field} must be >= 0")
    if iv > MAX_DURATION_MS:
        raise ValueError(f"{field} exceeds maximum of {MAX_DURATION_MS}")
    return iv


def validate_id_list(value, field):
    """Validate a list of positive integer IDs (e.g. for bulk delete).

    Always capped at ``MAX_BULK_IDS`` so a malicious client can't OOM
    the worker by POSTing a million-element array.
    """
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    if len(value) > MAX_BULK_IDS:
        raise ValueError(f"{field} exceeds {MAX_BULK_IDS} entries")
    out = []
    for i, item in enumerate(value):
        if not isinstance(item, int) or item <= 0:
            raise ValueError(f"{field}[{i}] must be a positive integer")
        out.append(item)
    return out


def validate_completed_at(value, field="completed_at"):
    """Optional ISO-8601 timestamp for backdating segment completion.

    Returns a naive UTC ``datetime`` (matching the column type) or None
    when the field is absent. Rejects values more than 24h away from
    server `utcnow()` in either direction — generous enough to log a
    ride from yesterday, tight enough to keep leaderboard manipulation
    bounded.
    """
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be an ISO-8601 string")
    raw = value.strip()
    # Python <3.11 fromisoformat doesn't accept the trailing 'Z'.
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    try:
        ts = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise ValueError(f"{field} is not a valid ISO-8601 timestamp") from exc
    if ts.tzinfo is None:
        # Treat naive timestamps as UTC; client SHOULD send tz-aware.
        ts = ts.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if abs(now - ts) > COMPLETED_AT_WINDOW:
        raise ValueError(
            f"{field} must be within "
            f"±{int(COMPLETED_AT_WINDOW.total_seconds() // 3600)}h of now"
        )
    # Persist as naive UTC to match the existing column type.
    return ts.astimezone(timezone.utc).replace(tzinfo=None)
