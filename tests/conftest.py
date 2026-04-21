"""Pytest fixtures for transit-explorer backend smoke tests.

Strategy:
- create_app() is invoked with FLASK_ENV=development so CORS doesn't fail-fast
  on missing ALLOWED_ORIGINS, and SKIP_STARTUP_DATA_TASKS=1 so we don't try to
  reach the OneBusAway API during tests.
- The DB is an in-memory SQLite per test session.
- Firebase ID-token verification is monkeypatched to return a deterministic
  set of claims, so authed endpoints can be exercised without real Firebase.
"""
import os
import pytest


@pytest.fixture(scope="session")
def _env():
    os.environ["FLASK_ENV"] = "development"
    os.environ["SKIP_STARTUP_DATA_TASKS"] = "1"
    os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    os.environ.setdefault("FIREBASE_PROJECT_ID", "test-project")
    # Disable Flask-Limiter rate enforcement during tests.
    os.environ["RATELIMIT_ENABLED"] = "False"


@pytest.fixture()
def app(_env, monkeypatch):
    # Disable rate limiting at the limiter level too (env var alone may not be
    # enough on older Flask-Limiter). Done via monkeypatching the limiter's
    # `enabled` attribute after the app is built.
    from app import create_app, db, limiter

    flask_app = create_app()
    limiter.enabled = False

    with flask_app.app_context():
        db.drop_all()
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def fake_uid():
    return "test-firebase-uid-123"


@pytest.fixture()
def auth_headers(monkeypatch, fake_uid):
    """Return headers with a fake bearer token; patch Firebase verification
    so any token string resolves to a deterministic user."""

    def _fake_verify(_token):
        return {
            "uid": fake_uid,
            "email": "test@example.com",
            "name": "Test User",
            "picture": "",
        }

    monkeypatch.setattr("app.auth.verify_firebase_token", _fake_verify)
    return {"Authorization": "Bearer fake-token"}


@pytest.fixture()
def seeded_route(app):
    """Insert a minimal route + direction with two stops for segment tests."""
    from app import db
    from app.models import Route, Stop, RouteDirection
    import json

    route = Route(
        id="1_100123",
        agency_id="1",
        short_name="40",
        long_name="Northgate - Downtown",
        description="",
        route_type=3,
        color="00aa00",
        text_color="ffffff",
        url="",
    )
    stops = [
        Stop(id=f"1_stop_{i}", name=f"Stop {i}", lat=47.6 + i * 0.001, lon=-122.3)
        for i in range(3)
    ]
    direction = RouteDirection(
        route_id=route.id,
        direction_id="0",
        direction_name="Northgate Station",
        encoded_polyline="",
        stop_ids_json=json.dumps([s.id for s in stops]),
    )
    db.session.add(route)
    for s in stops:
        db.session.add(s)
    db.session.add(direction)
    db.session.commit()
    return {"route": route, "direction": direction, "stops": stops}
