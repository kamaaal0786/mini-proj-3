"""
Auth tests — login, /me, invalid credentials.
SDK Section 15: Auth/RBAC — restricted roles cannot access protected endpoints.
"""
import pytest


class TestLogin:
    def test_login_returns_token(self, client, admin_token):
        """A valid login must return an access_token and the correct role."""
        resp = client.post(
            "/api/auth/login",
            data={"username": "test_admin@test.com", "password": "admin123"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["role"] == "admin"
        assert data["token_type"] == "bearer"

    def test_wrong_password_returns_401(self, client):
        resp = client.post(
            "/api/auth/login",
            data={"username": "test_admin@test.com", "password": "wrongpassword"},
        )
        assert resp.status_code == 401

    def test_unknown_email_returns_401(self, client):
        resp = client.post(
            "/api/auth/login",
            data={"username": "nobody@nowhere.com", "password": "any"},
        )
        assert resp.status_code == 401

    def test_me_returns_current_user(self, client, admin_token):
        resp = client.get(
            "/api/me",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["role"] == "admin"

    def test_me_without_token_returns_401(self, client):
        resp = client.get("/api/me")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client):
        resp = client.get(
            "/api/me",
            headers={"Authorization": "Bearer notavalidtoken"},
        )
        assert resp.status_code == 401
