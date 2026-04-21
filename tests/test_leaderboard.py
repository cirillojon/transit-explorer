def test_leaderboard_empty(client):
    r = client.get("/api/leaderboard")
    assert r.status_code == 200
    body = r.get_json()
    assert body["leaderboard"] == []
    assert body["period"] == "all"


def test_leaderboard_invalid_pagination(client):
    r = client.get("/api/leaderboard?limit=abc")
    assert r.status_code == 400


def test_leaderboard_includes_user_after_marking(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
        },
        headers=auth_headers,
    )

    r = client.get("/api/leaderboard")
    assert r.status_code == 200
    rows = r.get_json()["leaderboard"]
    assert len(rows) == 1
    assert rows[0]["total_segments"] == 1
    assert rows[0]["rank"] == 1


def test_debug_directions_blocked_in_production(client, monkeypatch):
    monkeypatch.setenv("FLASK_ENV", "production")
    r = client.get("/api/debug/directions")
    assert r.status_code == 404
