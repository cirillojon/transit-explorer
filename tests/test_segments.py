def test_mark_segments_validates_required_fields(client, auth_headers):
    r = client.post("/api/me/segments", json={}, headers=auth_headers)
    assert r.status_code == 400


def test_mark_segments_validates_id_format(client, auth_headers, seeded_route):
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": "../../etc/passwd",
            "direction_id": "0",
            "from_stop_id": seeded_route["stops"][0].id,
            "to_stop_id": seeded_route["stops"][1].id,
        },
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_mark_segments_rejects_oversize_notes(client, auth_headers, seeded_route):
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": seeded_route["stops"][0].id,
            "to_stop_id": seeded_route["stops"][1].id,
            "notes": "x" * 2000,
        },
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_mark_then_list_then_delete_segments(client, auth_headers, seeded_route):
    stops = seeded_route["stops"]
    payload = {
        "route_id": seeded_route["route"].id,
        "direction_id": "0",
        "from_stop_id": stops[0].id,
        "to_stop_id": stops[2].id,
        "notes": "trip home",
    }
    r = client.post("/api/me/segments", json=payload, headers=auth_headers)
    assert r.status_code == 201
    body = r.get_json()
    assert body["created"] == 2
    assert body["totals"]["total_segments"] == 2

    # Idempotent: second mark of same range returns 0 created
    r2 = client.post("/api/me/segments", json=payload, headers=auth_headers)
    assert r2.status_code == 201
    assert r2.get_json()["created"] == 0

    # Progress reflects the marked segments
    pg = client.get("/api/me/progress", headers=auth_headers)
    assert pg.status_code == 200
    progress = pg.get_json()["progress"]
    assert len(progress) == 1
    assert progress[0]["completed_segments"] == 2

    # Bulk delete by route wipes them
    rd = client.delete(
        "/api/me/segments/bulk",
        json={"route_id": seeded_route["route"].id, "confirm": True},
        headers=auth_headers,
    )
    assert rd.status_code == 200
    assert rd.get_json()["deleted"] == 2


def test_mark_segments_rejects_missing_stop(client, auth_headers, seeded_route):
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": seeded_route["stops"][0].id,
            "to_stop_id": "1_unknown_stop",
        },
        headers=auth_headers,
    )
    assert r.status_code == 400


def test_mark_segments_persists_duration_on_first_row(client, auth_headers, seeded_route):
    """duration_ms on a fresh multi-hop mark attaches to the first new row."""
    stops = seeded_route["stops"]
    r = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[2].id,
            "duration_ms": 123456,
        },
        headers=auth_headers,
    )
    assert r.status_code == 201
    body = r.get_json()
    assert body["created"] == 2
    segs = body["segments"]
    assert segs[0]["duration_ms"] == 123456
    assert segs[1]["duration_ms"] is None


def test_mark_segments_attaches_duration_to_first_new_row(client, auth_headers, seeded_route):
    """If pair_keys[0] was already marked, duration_ms must still land on
    the first *newly created* segment rather than being silently dropped."""
    stops = seeded_route["stops"]
    # Pre-mark the first hop only (no duration).
    r0 = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[1].id,
        },
        headers=auth_headers,
    )
    assert r0.status_code == 201
    assert r0.get_json()["created"] == 1

    # Now mark the full run with a measured duration. The first pair is
    # already present, so only the second pair is newly created -- the
    # duration must attach to that new row.
    r1 = client.post(
        "/api/me/segments",
        json={
            "route_id": seeded_route["route"].id,
            "direction_id": "0",
            "from_stop_id": stops[0].id,
            "to_stop_id": stops[2].id,
            "duration_ms": 98765,
        },
        headers=auth_headers,
    )
    assert r1.status_code == 201
    body = r1.get_json()
    assert body["created"] == 1
    assert body["skipped"] == 1
    assert body["segments"][0]["duration_ms"] == 98765

    # Progress endpoint surfaces the duration on the correct row so the
    # frontend's journey grouping can find it.
    pg = client.get("/api/me/progress", headers=auth_headers)
    assert pg.status_code == 200
    route_progress = pg.get_json()["progress"][0]
    durations = [s["duration_ms"] for s in route_progress["segments"]]
    assert 98765 in durations
