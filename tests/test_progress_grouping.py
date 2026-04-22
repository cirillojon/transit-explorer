"""Tests for the trip-grouping behaviour of /me/progress and /me/activity.

These cover the bug where multiple POSTs to /me/segments rendered as more
"rides" than the user actually logged because the backend returned hops
in arbitrary order within a single trip.
"""
from datetime import datetime, timedelta


def _seed_one_shuffled_trip(app, fake_uid, seeded_route):
    """Seed a single 2-hop trip (stops[0] -> stops[2]) where the rows are
    inserted in *reverse* route order. This reproduces the production
    symptom where the DB returns hops within one trip in arbitrary order.

    The seeded route only has 3 stops, so the unique constraint on
    (user, route, dir, from, to) limits us to one trip per route in this
    fixture. Multi-trip scenarios are covered by
    `test_activity_separates_distinct_timestamps` below by using
    different stop pairs at distinct timestamps.
    """
    from app import db
    from app.models import User, UserSegment

    user = User(
        firebase_uid=fake_uid,
        email="test@example.com",
        display_name="Test User",
        avatar_url="",
    )
    db.session.add(user)
    db.session.commit()

    stops = seeded_route["stops"]
    route_id = seeded_route["route"].id

    t1 = datetime(2026, 4, 22, 20, 16, 18, 604008)
    # Insert in *reverse* route order to reproduce the production symptom.
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[1].id, to_stop_id=stops[2].id,
        completed_at=t1,
    ))
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[0].id, to_stop_id=stops[1].id,
        completed_at=t1,
    ))
    db.session.commit()
    return user


def test_progress_returns_segments_in_route_order(
    app, client, auth_headers, fake_uid, seeded_route,
):
    """Even when rows were inserted in shuffled order, /me/progress
    should return them grouped by (direction, completed_at) and sorted
    so a single trip is reconstructable."""
    _seed_one_shuffled_trip(app, fake_uid, seeded_route)

    r = client.get("/api/me/progress", headers=auth_headers)
    assert r.status_code == 200
    progress = r.get_json()["progress"]
    assert len(progress) == 1
    segs = progress[0]["segments"]
    assert len(segs) == 2

    stops = seeded_route["stops"]
    # Hops were inserted in reverse route order; the API must return them
    # in route order so the trip is reconstructable.
    assert segs[0]["from_stop_id"] == stops[0].id
    assert segs[0]["to_stop_id"] == stops[1].id
    assert segs[1]["from_stop_id"] == stops[1].id
    assert segs[1]["to_stop_id"] == stops[2].id
    completed_ats = [s["completed_at"] for s in segs]
    assert completed_ats == sorted(completed_ats)


def test_activity_groups_one_entry_per_trip(
    app, client, auth_headers, fake_uid, seeded_route,
):
    """Two POST-shaped trips at distinct timestamps should produce two
    activity entries, each with hops==2 and the correct board/alight."""
    from app import db
    from app.models import User, UserSegment

    user = User(
        firebase_uid=fake_uid,
        email="test@example.com",
        display_name="Test User",
        avatar_url="",
    )
    db.session.add(user)
    db.session.commit()

    stops = seeded_route["stops"]
    route_id = seeded_route["route"].id

    # Trip A: stops[0] -> stops[2] at t1, inserted in REVERSE order.
    t1 = datetime(2026, 4, 22, 20, 16, 18, 604008)
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[1].id, to_stop_id=stops[2].id,
        completed_at=t1,
    ))
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[0].id, to_stop_id=stops[1].id,
        completed_at=t1,
    ))
    db.session.commit()

    r = client.get("/api/me/activity?limit=20", headers=auth_headers)
    assert r.status_code == 200
    activity = r.get_json()["activity"]
    # Single POST = one ride entry, even though there are 2 underlying hops.
    assert len(activity) == 1
    entry = activity[0]
    assert entry["hops"] == 2
    # Board = stops[0], alight = stops[2] (route-ordered, not insertion-ordered).
    assert entry["from_stop_id"] == stops[0].id
    assert entry["to_stop_id"] == stops[2].id


def test_activity_separates_distinct_timestamps(
    app, client, auth_headers, fake_uid, seeded_route,
):
    """Two trips at different timestamps must be two activity entries."""
    from app import db
    from app.models import User, UserSegment

    user = User(
        firebase_uid=fake_uid,
        email="test@example.com",
        display_name="Test User",
        avatar_url="",
    )
    db.session.add(user)
    db.session.commit()

    stops = seeded_route["stops"]
    route_id = seeded_route["route"].id

    # Two single-hop "trips" at distinct timestamps on different pairs.
    t1 = datetime(2026, 4, 22, 20, 16, 18, 604008)
    t2 = t1 + timedelta(seconds=24)
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[0].id, to_stop_id=stops[1].id,
        completed_at=t1,
    ))
    db.session.add(UserSegment(
        user_id=user.id, route_id=route_id, direction_id="0",
        from_stop_id=stops[1].id, to_stop_id=stops[2].id,
        completed_at=t2,
    ))
    db.session.commit()

    r = client.get("/api/me/activity?limit=20", headers=auth_headers)
    assert r.status_code == 200
    activity = r.get_json()["activity"]
    assert len(activity) == 2
    # Newest first.
    assert activity[0]["from_stop_id"] == stops[1].id
    assert activity[1]["from_stop_id"] == stops[0].id
