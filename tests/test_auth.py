def test_me_requires_auth(client):
    r = client.get("/api/me")
    assert r.status_code == 401


def test_me_rejects_malformed_header(client):
    r = client.get("/api/me", headers={"Authorization": "NotBearer xyz"})
    assert r.status_code == 401


def test_me_accepts_mocked_token(client, auth_headers):
    r = client.get("/api/me", headers=auth_headers)
    assert r.status_code == 200
    body = r.get_json()
    assert body["email"] == "test@example.com"
    assert body["total_segments"] == 0


def test_invalid_token_claims_rejected(client, monkeypatch):
    monkeypatch.setattr("app.auth.verify_firebase_token", lambda _t: {"email": "x"})
    r = client.get("/api/me", headers={"Authorization": "Bearer bad"})
    assert r.status_code == 401
