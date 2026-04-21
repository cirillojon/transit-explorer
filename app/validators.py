"""Lightweight request-payload validators.

Kept dependency-free so we don't pull in pydantic/marshmallow for a small
surface area. Each helper raises ValueError with a user-safe message on
invalid input; callers translate to a 400 JSON response.
"""
import re

# Stop / route / direction IDs in OneBusAway are typically of the form
# "<agency>_<id>" using ASCII alphanumerics, dashes, underscores, dots, colons.
_ID_RE = re.compile(r"^[A-Za-z0-9_\-\.:]{1,80}$")

MAX_NOTES_LEN = 500
MAX_BULK_IDS = 500


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


def validate_id_list(value, field, max_len=MAX_BULK_IDS):
    if not isinstance(value, list):
        raise ValueError(f"{field} must be a list")
    if len(value) > max_len:
        raise ValueError(f"{field} exceeds {max_len} entries")
    out = []
    for i, item in enumerate(value):
        if not isinstance(item, int) or item <= 0:
            raise ValueError(f"{field}[{i}] must be a positive integer")
        out.append(item)
    return out
