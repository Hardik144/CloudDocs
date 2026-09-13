import pytest
from fastapi.testclient import TestClient

def test_health_endpoints(client: TestClient):
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"

    ready_resp = client.get("/health/ready")
    assert ready_resp.status_code == 200
    assert ready_resp.json()["ready"] is True

def test_metrics_endpoint(client: TestClient):
    resp = client.get("/metrics")
    assert resp.status_code == 200
    assert "http_requests_total" in resp.text

def test_auth_registration_and_login(client: TestClient):
    # 1. Register user
    reg_resp = client.post("/api/v1/auth/register", json={
        "email": "testuser@clouddocs.io",
        "name": "Test User",
        "password": "Password123!"
    })
    assert reg_resp.status_code == 201
    token_data = reg_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 2. Login
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "testuser@clouddocs.io",
        "password": "Password123!"
    })
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()

    # 3. Get profile
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "testuser@clouddocs.io"

def test_demo_login(client: TestClient):
    resp = client.post("/api/v1/auth/demo-login")
    assert resp.status_code == 200
    assert "access_token" in resp.json()
    assert resp.json()["user"]["is_demo_user"] is True

def test_project_and_task_lifecycle(client: TestClient):
    # Login as demo user
    demo_resp = client.post("/api/v1/auth/demo-login")
    token = demo_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create project
    proj_resp = client.post("/api/v1/projects/", json={
        "name": "DevOps Pipeline Automation",
        "description": "Kubernetes and GitHub Actions automation project",
        "status": "active",
        "priority": "high"
    }, headers=headers)
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # 2. Create task
    task_resp = client.post("/api/v1/tasks/", json={
        "project_id": proj_id,
        "title": "Write Dockerfile and healthchecks",
        "description": "Multi-stage python build",
        "priority": "critical",
        "status": "todo"
    }, headers=headers)
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]

    # 3. Update task status
    task_update = client.put(f"/api/v1/tasks/{task_id}", json={
        "status": "completed"
    }, headers=headers)
    assert task_update.status_code == 200
    assert task_update.json()["status"] == "completed"

    # 4. Check project health score calculation
    health_resp = client.get(f"/api/v1/projects/{proj_id}/health", headers=headers)
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert "score" in health_data
    assert "breakdown" in health_data
    assert health_data["breakdown"]["task_completion"] == 100.0

def test_document_upload_and_versioning(client: TestClient):
    demo_resp = client.post("/api/v1/auth/demo-login")
    token = demo_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Request upload authorization
    req_resp = client.post("/api/v1/documents/request-upload", json={
        "filename": "release_notes.txt",
        "mime_type": "text/plain",
        "file_size": 250
    }, headers=headers)
    assert req_resp.status_code == 200
    auth_data = req_resp.json()
    storage_key = auth_data["storage_key"]

    # 2. Upload file content via local fallback storage endpoint
    upload_file_resp = client.post(
        f"/api/v1/storage/upload/{storage_key}",
        files={"file": ("release_notes.txt", b"Initial release v1.0.0 notes", "text/plain")}
    )
    assert upload_file_resp.status_code == 200

    # 3. Complete metadata in PostgreSQL
    comp_resp = client.post("/api/v1/documents/complete-upload", json={
        "name": "release_notes.txt",
        "storage_key": storage_key,
        "mime_type": "text/plain",
        "file_size": 30,
        "description": "Production release notes"
    }, headers=headers)
    assert comp_resp.status_code == 201
    doc_id = comp_resp.json()["id"]
    assert comp_resp.json()["current_version"] == 1

    # 4. In-browser text editing (saves directly and bumps to v2)
    edit_resp = client.put(f"/api/v1/documents/{doc_id}/content", json={
        "content": "Release v1.0.0 notes updated with patch details.",
        "change_description": "Added patch details"
    }, headers=headers)
    assert edit_resp.status_code == 200
    assert edit_resp.json()["current_version"] == 2

    # 5. Create secure share link
    share_link_resp = client.post(f"/api/v1/documents/{doc_id}/share-link", json={
        "permission_level": "viewer",
        "expires_in_hours": 24
    }, headers=headers)
    assert share_link_resp.status_code == 200
    token = share_link_resp.json()["token"]

    # 6. Retrieve document via public share token
    public_doc = client.get(f"/api/v1/documents/shared/{token}")
    assert public_doc.status_code == 200
    assert public_doc.json()["name"] == "release_notes.txt"

def test_storage_summary(client: TestClient):
    demo_resp = client.post("/api/v1/auth/demo-login")
    token = demo_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/storage/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "used_bytes" in data
    assert "quota_bytes" in data
    assert "types_breakdown" in data
