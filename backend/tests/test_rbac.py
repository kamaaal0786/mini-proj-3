"""
RBAC tests — role boundaries enforced on every protected endpoint.
SDK Section 15: restricted roles cannot access protected endpoints.
"""
import pytest


class TestRBAC:
    def test_student_cannot_create_student(self, client, student_token):
        """A student token must be rejected by POST /api/students (admin only)."""
        resp = client.post(
            "/api/students",
            json={
                "email": "new@test.com",
                "name": "New Student",
                "password": "pass123",
                "roll_no": "NEW001",
                "program": "B.Tech",
                "semester": 1,
            },
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403

    def test_student_cannot_list_all_users(self, client, student_token):
        """A student token must be rejected by GET /api/users (admin only)."""
        resp = client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_students(self, client):
        """Unauthenticated requests to protected endpoints must return 401."""
        resp = client.get("/api/students")
        assert resp.status_code == 401

    def test_unauthenticated_cannot_create_student(self, client):
        resp = client.post("/api/students", json={})
        assert resp.status_code == 401

    def test_admin_can_list_users(self, client, admin_token):
        """Admin token must be accepted by GET /api/users."""
        resp = client.get(
            "/api/users",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_student_can_access_own_list(self, client, student_token):
        """A student can call GET /api/students — returns only their own record."""
        resp = client.get(
            "/api/students",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert resp.status_code == 200
        data = resp.json()
        # Should return exactly 1 record (themselves)
        assert len(data) == 1
        assert data[0]["role"] == "student"

    def test_health_endpoint_is_public(self, client):
        """The /health endpoint must not require auth."""
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
