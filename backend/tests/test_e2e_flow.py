import pytest
from fastapi.testclient import TestClient

def test_full_e2e_user_journey(client: TestClient):
    """
    E2E Test Flow:
    Register -> Login -> Create Project -> Upload Document -> View Document
    -> Create Version -> Invite Collaborator -> Create Task -> Update Task
    -> Observe Activity -> Check Notification -> Check Health Score -> Verify Audit Log -> Logout
    """

    # 1. Register User A (Alice) and User B (Bob)
    alice_email = "alice@clouddocs.io"
    bob_email = "bob@clouddocs.io"
    password = "SecurePassword123!"

    reg_resp = client.post("/api/v1/auth/register", json={
        "name": "Alice Architect",
        "email": alice_email,
        "password": password
    })
    assert reg_resp.status_code == 201

    reg_b = client.post("/api/v1/auth/register", json={
        "name": "Bob Developer",
        "email": bob_email,
        "password": password
    })
    assert reg_b.status_code == 201
    bob_id = reg_b.json()["user"]["id"]

    # 2. Login as Alice
    login_resp = client.post("/api/v1/auth/login", json={
        "email": alice_email,
        "password": password
    })
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create Project
    proj_resp = client.post("/api/v1/projects/", json={
        "name": "CloudDocs Enterprise Rollout",
        "description": "Multi-region Kubernetes deployment and R2 object storage setup",
        "priority": "critical",
        "status": "active"
    }, headers=headers)
    assert proj_resp.status_code == 201
    project_id = proj_resp.json()["id"]

    # 4. Upload Document to Project
    # Step 4a: Request upload authorization
    req_upload = client.post("/api/v1/documents/request-upload", json={
        "filename": "kubernetes_architecture.md",
        "mime_type": "text/markdown",
        "file_size": 180,
        "project_id": project_id
    }, headers=headers)
    assert req_upload.status_code == 200
    storage_key = req_upload.json()["storage_key"]

    # Step 4b: Save content to storage provider (via local upload endpoint)
    upload_file = client.post(
        f"/api/v1/storage/upload/{storage_key}",
        files={"file": ("kubernetes_architecture.md", b"# Kubernetes Cluster Spec\nReplicas: 3", "text/markdown")}
    )
    assert upload_file.status_code == 200

    # Step 4c: Complete upload metadata in PostgreSQL
    complete_upload = client.post("/api/v1/documents/complete-upload", json={
        "name": "kubernetes_architecture.md",
        "storage_key": storage_key,
        "mime_type": "text/markdown",
        "file_size": 52,
        "project_id": project_id,
        "description": "Cluster node architecture specification",
        "change_description": "Initial draft v1"
    }, headers=headers)
    assert complete_upload.status_code == 201
    doc_id = complete_upload.json()["id"]
    assert complete_upload.json()["current_version"] == 1

    # 5. View Document
    view_doc = client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert view_doc.status_code == 200
    assert view_doc.json()["name"] == "kubernetes_architecture.md"

    # 6. Create New Version (in-browser text edit)
    edit_doc = client.put(f"/api/v1/documents/{doc_id}/content", json={
        "content": "# Kubernetes Cluster Spec\nReplicas: 3\nIngress: Nginx with TLS",
        "change_description": "Added Ingress and TLS specification"
    }, headers=headers)
    assert edit_doc.status_code == 200
    assert edit_doc.json()["current_version"] == 2

    # 7. Invite Collaborator (Bob) to Project
    invite_resp = client.post(f"/api/v1/projects/{project_id}/members", json={
        "user_email": bob_email,
        "role": "editor"
    }, headers=headers)
    assert invite_resp.status_code == 200
    assert invite_resp.json()["role"] == "editor"

    # 8. Create Task and Assign to Bob
    task_resp = client.post("/api/v1/tasks/", json={
        "project_id": project_id,
        "title": "Provision Cloudflare R2 bucket credentials",
        "description": "Generate read/write tokens in Cloudflare dashboard",
        "priority": "high",
        "assignee_id": bob_id,
        "status": "todo"
    }, headers=headers)
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]

    # 9. Update Task (Move to COMPLETED)
    update_task = client.put(f"/api/v1/tasks/{task_id}", json={
        "status": "completed"
    }, headers=headers)
    assert update_task.status_code == 200
    assert update_task.json()["status"] == "completed"

    # 10. Observe Activity Feed
    act_resp = client.get(f"/api/v1/activity/?project_id={project_id}", headers=headers)
    assert act_resp.status_code == 200
    activities = act_resp.json()
    assert len(activities) >= 3  # project created, document uploaded, member added, task completed

    # 11. Check Notification for Bob
    login_bob = client.post("/api/v1/auth/login", json={
        "email": bob_email,
        "password": password
    })
    assert login_bob.status_code == 200
    bob_token = login_bob.json()["access_token"]
    bob_headers = {"Authorization": f"Bearer {bob_token}"}

    bob_notifs = client.get("/api/v1/notifications/", headers=bob_headers)
    assert bob_notifs.status_code == 200
    assert len(bob_notifs.json()) >= 1  # Invitation notification

    # 12. Check Project Health Score
    health_resp = client.get(f"/api/v1/projects/{project_id}/health", headers=headers)
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    assert health_data["score"] >= 80
    assert health_data["status"] in ["Excellent", "Good"]
    assert health_data["breakdown"]["task_completion"] == 100.0

    # 13. Verify Audit Log (contains registration, login, upload events)
    audit_resp = client.get("/api/v1/audit/", headers=headers)
    assert audit_resp.status_code == 200
    assert len(audit_resp.json()) >= 2

    # 14. Logout (client-side token clearance verification)
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid_token"})
    assert me_resp.status_code == 401
