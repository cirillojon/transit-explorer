"""Regression tests for GET /api/users/<id>/profile progress ordering.

Asserts that the `progress` list is sorted by completion_pct DESC, then
completed_segments DESC, then route_name ASC, then route_id ASC — consistent
with get_stats() and the documented sort key in get_user_profile().
"""
import json
import pytest


def _seed_two_routes(app, fake_uid):
    """Create a user and two routes with different completion levels.

    Route A ("A_route"): 4 stops → 3 total segments, user completes 2 (66.7%)
    Route B ("B_route"): 3 stops → 2 total segments, user completes 2 (100%)

    Expected order: B first (100%), A second (66.7%).
    """
    from app import db
    from app.models import User, Route, Stop, RouteDirection, UserSegment

    user = User(
        firebase_uid=fake_uid,
        email="profile@example.com",
        display_name="Profile Tester",
        avatar_url="",
    )
    db.session.add(user)
    db.session.flush()

    # Route A — 4 stops, 3 total segments
    route_a = Route(
        id="A_route",
        agency_id="1",
        short_name="A",
        long_name="Route A",
        description="",
        route_type=3,
        color="ff0000",
        text_color="ffffff",
        url="",
    )
    stops_a = [
        Stop(id=f"A_stop_{i}", name=f"A Stop {i}", lat=47.6 + i * 0.001, lon=-122.3)
        for i in range(4)
    ]
    dir_a = RouteDirection(
        route_id="A_route",
        direction_id="0",
        direction_name="Northbound",
        encoded_polyline="",
        stop_ids_json=json.dumps([s.id for s in stops_a]),
    )

    # Route B — 3 stops, 2 total segments
    route_b = Route(
        id="B_route",
        agency_id="1",
        short_name="B",
        long_name="Route B",
        description="",
        route_type=3,
        color="0000ff",
        text_color="ffffff",
        url="",
    )
    stops_b = [
        Stop(id=f"B_stop_{i}", name=f"B Stop {i}", lat=47.7 + i * 0.001, lon=-122.3)
        for i in range(3)
    ]
    dir_b = RouteDirection(
        route_id="B_route",
        direction_id="0",
        direction_name="Southbound",
        encoded_polyline="",
        stop_ids_json=json.dumps([s.id for s in stops_b]),
    )

    for obj in [route_a, route_b, *stops_a, *stops_b, dir_a, dir_b]:
        db.session.add(obj)
    db.session.flush()

    # User completes 2 of 3 segments on Route A (66.7%)
    db.session.add(UserSegment(
        user_id=user.id, route_id="A_route", direction_id="0",
        from_stop_id=stops_a[0].id, to_stop_id=stops_a[1].id,
    ))
    db.session.add(UserSegment(
        user_id=user.id, route_id="A_route", direction_id="0",
        from_stop_id=stops_a[1].id, to_stop_id=stops_a[2].id,
    ))

    # User completes all 2 segments on Route B (100%)
    db.session.add(UserSegment(
        user_id=user.id, route_id="B_route", direction_id="0",
        from_stop_id=stops_b[0].id, to_stop_id=stops_b[1].id,
    ))
    db.session.add(UserSegment(
        user_id=user.id, route_id="B_route", direction_id="0",
        from_stop_id=stops_b[1].id, to_stop_id=stops_b[2].id,
    ))

    db.session.commit()
    return user


def test_profile_progress_sorted_by_completion_pct_desc(app, client, fake_uid):
    """Routes with higher completion % must appear first in the progress list."""
    user = _seed_two_routes(app, fake_uid)

    r = client.get(f"/api/users/{user.id}/profile")
    assert r.status_code == 200

    progress = r.get_json()["progress"]
    assert len(progress) == 2

    # Route B (100%) must come before Route A (66.7%)
    assert progress[0]["route_id"] == "B_route"
    assert progress[0]["completion_pct"] == 100.0
    assert progress[1]["route_id"] == "A_route"
    assert progress[1]["completion_pct"] < 100.0


def _seed_tied_routes(app, fake_uid):
    """Create a user and two routes that tie on completion_pct but differ on
    completed_segments, to exercise the secondary sort key.

    Route C: 4 stops → 3 total, completes 2 (66.7%)
    Route D: 3 stops → but only 2 counted after dedupe, completes 1 (50%)

    We actually want equal pct: use 4 stops each, complete 2 of 3 each → 66.7%,
    but Route C has 2 completed_segments and Route D has 1 (partial).
    Actually let's use:
      Route P: 6 stops → 5 segments, completes 2 (40%)  ← tie on pct
      Route Q: 4 stops → 5 segments... hmm this is tricky with integer math.

    Simplest: both routes have 4 stops (3 segments). Route P completes 2 (66.7%),
    Route Q completes 2 (66.7%) as well — they tie on pct. Then we distinguish
    by completed_segments which is equal too.  For the tie-break test we
    actually need differing completed_segments at the same pct, which requires
    different total_segments but same ratio.  Use:
      Route P: 2 stops → 1 segment, completes 1 (100%)
      Route Q: 4 stops → 3 segments, completes 3 (100%)
    Both are 100%, but Q has more completed_segments → Q should come first.
    """
    from app import db
    from app.models import User, Route, Stop, RouteDirection, UserSegment

    user = User(
        firebase_uid=fake_uid,
        email="tie@example.com",
        display_name="Tie Tester",
        avatar_url="",
    )
    db.session.add(user)
    db.session.flush()

    # Route P: 2 stops → 1 segment, 100% complete (1 completed)
    route_p = Route(
        id="P_route", agency_id="1", short_name="P", long_name="Route P",
        description="", route_type=3, color="aaaaaa", text_color="000000", url="",
    )
    stops_p = [
        Stop(id=f"P_stop_{i}", name=f"P Stop {i}", lat=47.8 + i * 0.001, lon=-122.3)
        for i in range(2)
    ]
    dir_p = RouteDirection(
        route_id="P_route", direction_id="0", direction_name="P dir",
        encoded_polyline="", stop_ids_json=json.dumps([s.id for s in stops_p]),
    )

    # Route Q: 4 stops → 3 segments, 100% complete (3 completed)
    route_q = Route(
        id="Q_route", agency_id="1", short_name="Q", long_name="Route Q",
        description="", route_type=3, color="bbbbbb", text_color="000000", url="",
    )
    stops_q = [
        Stop(id=f"Q_stop_{i}", name=f"Q Stop {i}", lat=47.9 + i * 0.001, lon=-122.3)
        for i in range(4)
    ]
    dir_q = RouteDirection(
        route_id="Q_route", direction_id="0", direction_name="Q dir",
        encoded_polyline="", stop_ids_json=json.dumps([s.id for s in stops_q]),
    )

    for obj in [route_p, route_q, *stops_p, *stops_q, dir_p, dir_q]:
        db.session.add(obj)
    db.session.flush()

    # Route P: 1 completed segment (100%)
    db.session.add(UserSegment(
        user_id=user.id, route_id="P_route", direction_id="0",
        from_stop_id=stops_p[0].id, to_stop_id=stops_p[1].id,
    ))

    # Route Q: 3 completed segments (100%)
    for i in range(3):
        db.session.add(UserSegment(
            user_id=user.id, route_id="Q_route", direction_id="0",
            from_stop_id=stops_q[i].id, to_stop_id=stops_q[i + 1].id,
        ))

    db.session.commit()
    return user


def test_profile_progress_tie_broken_by_completed_segments(app, client, fake_uid):
    """When two routes share the same completion_pct, the one with more
    completed_segments must come first."""
    user = _seed_tied_routes(app, fake_uid)

    r = client.get(f"/api/users/{user.id}/profile")
    assert r.status_code == 200

    progress = r.get_json()["progress"]
    assert len(progress) == 2
    assert progress[0]["completion_pct"] == progress[1]["completion_pct"] == 100.0
    # Q has 3 completed segments vs P's 1 → Q must be first
    assert progress[0]["route_id"] == "Q_route"
    assert progress[1]["route_id"] == "P_route"
