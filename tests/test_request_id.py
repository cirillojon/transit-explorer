"""Regression coverage for Phase 4 observability:

- Every response carries an X-Request-ID header.
- An inbound X-Request-ID is honored when it looks safe.
- A bogus inbound X-Request-ID (control chars, oversized) is replaced.
- Two requests yield two distinct ids when none is forwarded.
"""


def test_response_has_request_id_header(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    rid = r.headers.get("X-Request-ID")
    assert rid and len(rid) >= 16


def test_safe_inbound_request_id_is_echoed(client):
    inbound = "trace-abc_123"
    r = client.get("/api/health", headers={"X-Request-ID": inbound})
    assert r.headers.get("X-Request-ID") == inbound


def test_unsafe_inbound_request_id_replaced(client):
    # Control chars / spaces / over-length -> must be replaced.
    for bad in ["bad id with spaces", "x" * 200, "ctrl\x00char"]:
        r = client.get("/api/health", headers={"X-Request-ID": bad})
        echoed = r.headers.get("X-Request-ID")
        assert echoed and echoed != bad, bad


def test_distinct_request_ids_per_call(client):
    r1 = client.get("/api/health")
    r2 = client.get("/api/health")
    assert r1.headers["X-Request-ID"] != r2.headers["X-Request-ID"]
