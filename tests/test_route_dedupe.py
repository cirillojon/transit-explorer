"""Regression tests for the duplicate-stop dedupe in GET /api/routes/<id>.

Background: OBA's stopGroupings sometimes append a stop from one direction
onto the tail of the opposite direction's stopIds. On the Sound Transit 1
Line, the southbound SeaTac platform is appended at the end of the
"Lynnwood City Center" direction *after* the Lynnwood terminus. That
breaks the boarding -> alighting downstream check because the user's
boarding stop ends up at the highest index in its direction, making every
candidate alighting stop look "behind" it.
"""
import json

from app import db
from app.models import Route, RouteDirection, Stop


def _seed_route_with_trailing_dup():
    route = Route(
        id="40_test1line",
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

    # Two physical SeaTac platforms ~10m apart; same name. Plus two normal
    # stops to flank them so dedupe can't accidentally collapse different
    # stops sharing only coords-or-only-name.
    db.session.add_all([
        Stop(id="40_99903", name="SeaTac/Airport", lat=47.445053, lon=-122.296692),
        Stop(id="40_99904", name="SeaTac/Airport", lat=47.444969, lon=-122.297028),
        Stop(id="40_99905", name="Tukwila Int'l Blvd", lat=47.463924, lon=-122.288002),
        Stop(id="40_N23-T1", name="Lynnwood City Center", lat=47.815876, lon=-122.294275),
    ])

    # Direction 1 ("Lynnwood City Center"): natural order is SeaTac (99903)
    # -> Tukwila -> Lynnwood. OBA bogusly appends the southbound SeaTac
    # platform (99904) at the end, AFTER the Lynnwood terminus.
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


def test_get_route_dedupes_trailing_duplicate_platform(app, client):
    with app.app_context():
        _seed_route_with_trailing_dup()

    resp = client.get("/api/routes/40_test1line")
    assert resp.status_code == 200
    payload = resp.get_json()

    dirs = {d["direction_id"]: d for d in payload["directions"]}
    stop_ids = dirs["1"]["stop_ids"]

    # The trailing duplicate SeaTac platform must be stripped so the
    # boarding stop's index can't exceed the destination's index.
    assert stop_ids == ["40_99903", "40_99905", "40_N23-T1"]
    # total_segments must reflect the deduped list (3 stops -> 2 segments).
    assert payload["total_segments"] == 2


def test_get_route_keeps_distinct_stops_with_same_name(app, client):
    """Sanity check: two stops sharing a name but far apart are NOT merged."""
    with app.app_context():
        route = Route(
            id="40_circ", agency_id="40", short_name="C", long_name="Circ",
            description="", route_type=3, color="000000", text_color="ffffff",
            url="",
        )
        db.session.add(route)
        db.session.add_all([
            # Two real "Main St" stops ~5km apart in different neighborhoods.
            Stop(id="s_a", name="Main St", lat=47.60, lon=-122.30),
            Stop(id="s_b", name="Main St", lat=47.65, lon=-122.30),
            Stop(id="s_mid", name="Other", lat=47.62, lon=-122.30),
        ])
        db.session.add(RouteDirection(
            route_id=route.id, direction_id="0", direction_name="Outbound",
            encoded_polyline="",
            stop_ids_json=json.dumps(["s_a", "s_mid", "s_b"]),
        ))
        db.session.commit()

    resp = client.get("/api/routes/40_circ")
    assert resp.status_code == 200
    payload = resp.get_json()
    stop_ids = payload["directions"][0]["stop_ids"]
    assert stop_ids == ["s_a", "s_mid", "s_b"]
