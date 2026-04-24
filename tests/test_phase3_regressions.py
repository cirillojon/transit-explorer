"""Regression coverage for the Phase 3 API hardening:

- /leaderboard period validation (400 on garbage)
- /stops pagination response shape
- mark_segments accepts/validates client-supplied completed_at within \u00b124h
- mark_segments rejects out-of-window completed_at
- IDOR: PATCH/DELETE on another user's segment returns 404, not 200
- PATCH /me/segments/<id> partial updates atomically
"""
from datetime import datetime, timezone, timedelta


def test_leaderboard_invalid_period_400(client):
    r = client.get("/api/leaderboard?period=yesterday")
    assert r.status_code == 400
    assert "period" in r.get_json()["error"]


def test_leaderboard_accepts_known_periods(client):
    for p in ("all", "week", "month"):
        r = client.get(f"/api/leaderboard?period={p}")
        assert r.status_code == 200, p


def test_stops_pagination_shape(client, seeded_route):
    r = client.get("/api/stops?limit=2&offset=0")
    assert r.status_code == 200
    body = r.get_json()
    assert set(body.keys()) >= {"stops", "limit", "offset", "total", "next_offset"}
    assert body["limit"] == 2
    assert body["offset"] == 0
    assert body["total"] == 3
    assert len(body["stops"]) == 2
    assert body["next_offset"] == 2

    r2 = client.get("/api/stops?limit=2&offset=2")
    body2 = r2.get_json()
    assert len(body2["stops"]) == 1
    assert body2["next_offset"] is None


def test_stops_pagination_rejects_garbage(client):
    r = client.get("/api/stops?limit=notanumber")
    assert r.status_code == 400


def test_mark_segments_accepts_recent_completed_at(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    ts = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
            "completed_at": ts,
        },
        headers=auth_headers,
    )
    assert r.status_code == 201
    seg = r.get_json()["segments"][0]
    # Persisted as naive UTC; parse and compare loosely.
    persisted = datetime.fromisoformat(seg["completed_at"].replace("Z", ""))
    assert abs((persisted - datetime.utcnow()).total_seconds()) < 4 * 3600


def test_mark_segments_rejects_far_past_completed_at(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    ts = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
            "completed_at": ts,
        },
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_mark_segments_rejects_garbage_completed_at(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
            "completed_at": "not-a-date",
        },
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_patch_segment_partial_update(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
            "notes": "before",
        },
        headers=auth_headers,
    )
    seg_id = r.get_json()["segments"][0]["id"]

    # notes-only patch keeps duration unchanged
    r1 = client.patch(
        f"/api/me/segments/{seg_id}",
        json={"notes": "after"},
        headers=auth_headers,
    )
    assert r1.status_code == 200
    assert r1.get_json()["notes"] == "after"

    # duration-only patch keeps notes unchanged
    r2 = client.patch(
        f"/api/me/segments/{seg_id}",
        json={"duration_ms": 4242},
        headers=auth_headers,
    )
    assert r2.status_code == 200
    body = r2.get_json()
    assert body["duration_ms"] == 4242
    assert body["notes"] == "after"


def test_patch_segment_empty_body_rejected(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
        },
        headers=auth_headers,
    )
    seg_id = r.get_json()["segments"][0]["id"]
    r1 = client.patch(f"/api/me/segments/{seg_id}", json={}, headers=auth_headers)
    assert r1.status_code == 400


def test_idor_patch_other_users_segment_returns_404(
    client, auth_headers, seeded_route, monkeypatch
):
    """User A creates a segment; user B must not be able to PATCH it."""
    stops = seeded_route["stops"]
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
        },
        headers=auth_headers,
    )
    seg_id = r.get_json()["segments"][0]["id"]

    # Re-bind verify_firebase_token to a *different* uid -> different user.
    def _verify_other(_t):
        return {
            "uid": "test-firebase-uid-OTHER",
            "email": "other@example.com",
            "name": "Other",
            "picture": "",
        }

    monkeypatch.setattr("app.auth.verify_firebase_token", _verify_other)
    other_headers = {"Authorization": "Bearer other-token"}

    r_patch = client.patch(
        f"/api/me/segments/{seg_id}",
        json={"notes": "hacked"},
        headers=other_headers,
    )
    assert r_patch.status_code == 404

    r_del = client.delete(f"/api/me/segments/{seg_id}", headers=other_headers)
    assert r_del.status_code == 404
