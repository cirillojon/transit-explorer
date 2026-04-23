"""Regression test: /me/progress totals must match the deduped hops the
frontend actually exposes.

Bug: a user marked every hop on Sound Transit 1 Line in both directions
(26 + 27 segments) but the Progress panel showed 96% complete. Cause: the
denominator was computed from the raw OBA stop list, which on the 1 Line
includes a same-name SeaTac platform appended after the Lynnwood
terminus. ``GET /api/routes/<id>`` strips that duplicate before the user
ever sees it, so the numerator could never reach the raw denominator.
"""
import json

from app import db
from app.models import Route, RouteDirection, Stop


def _seed_one_line():
    route = Route(
        id="40_test1line_progress",
        agency_id="40",
        short_name="1 Line",
        long_name="Lynnwood - Federal Way",
        description="",
        route_type=0,
        color="28813F",
        text_color="FFFFFF",
        url="",
    )
    db.session.add(route)
    db.session.add_all([
        Stop(id="40_99903", name="SeaTac/Airport", lat=47.445053, lon=-122.296692),
        Stop(id="40_99904", name="SeaTac/Airport", lat=47.444969, lon=-122.297028),
        Stop(id="40_99905", name="Tukwila Int'l Blvd", lat=47.463924, lon=-122.288002),
        Stop(id="40_N23-T1", name="Lynnwood City Center", lat=47.815876, lon=-122.294275),
    ])
    # Raw OBA list has the trailing duplicate platform (4 stops -> 3 raw hops);
    # the deduped list the frontend sees is 3 stops -> 2 hops.
    db.session.add(RouteDirection(
        route_id=route.id,
        direction_id="1",
        direction_name="Lynnwood City Center",
        encoded_polyline="",
        stop_ids_json=json.dumps([
            "40_99903", "40_99905", "40_N23-T1", "40_99904",
        ]),
    ))
    db.session.commit()


def test_progress_total_uses_deduped_stop_count(app, client, auth_headers):
    with app.app_context():
        _seed_one_line()

    # Mark every hop the frontend exposes (the deduped 2 hops) via the API
    # so the User row gets created through the normal auth flow.
    mark = client.post(
        "/api/me/segments",
        json={
            "route_id": "40_test1line_progress",
            "direction_id": "1",
            "from_stop_id": "40_99903",
            "to_stop_id": "40_N23-T1",
        },
        headers=auth_headers,
    )
    assert mark.status_code == 201, mark.get_data(as_text=True)
    assert mark.get_json()["created"] == 2

    resp = client.get("/api/me/progress", headers=auth_headers)
    assert resp.status_code == 200
    rows = resp.get_json()["progress"]
    assert len(rows) == 1
    row = rows[0]
    # 3 deduped stops -> 2 hops, user marked both -> 100%.
    assert row["total_segments"] == 2
    assert row["completed_segments"] == 2
    assert row["completion_pct"] == 100
    # The directions[].stop_ids in the progress payload must also be the
    # deduped list, otherwise frontend trip-grouping would key off ghost
    # stops the user can't see.
    assert row["directions"][0]["stop_ids"] == [
        "40_99903", "40_99905", "40_N23-T1",
    ]
    assert row["directions"][0]["total_hops"] == 2


def test_route_segment_counts_helper_dedupes(app):
    from app.routes.api import _route_segment_counts

    with app.app_context():
        _seed_one_line()
        counts = _route_segment_counts()
    # 3 deduped stops -> 2 hops, not 3.
    assert counts.get("40_test1line_progress") == 2
