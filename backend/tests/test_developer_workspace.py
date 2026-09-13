import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_code_runner_execution(client: TestClient):
    # Login via demo login
    login_res = client.post("/api/v1/auth/demo-login")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Successful Python execution
    code = "print('Hello CloudDocs DevOps!')\nfor i in range(3):\n    print(f'Step {i}')"
    res = client.post(
        "/api/v1/runner/execute",
        headers=headers,
        json={"code": code, "language": "python"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["exit_code"] == 0
    assert "Hello CloudDocs DevOps!" in data["stdout"]
    assert "Step 2" in data["stdout"]
    assert data["duration_ms"] > 0

    # 2. Syntax/Runtime error handling
    bad_code = "raise ValueError('Custom failure test')"
    res_err = client.post(
        "/api/v1/runner/execute",
        headers=headers,
        json={"code": bad_code, "language": "python"}
    )
    assert res_err.status_code == 200
    err_data = res_err.json()
    assert err_data["exit_code"] != 0
    assert "Custom failure test" in err_data["stderr"]

    # 3. Timeout enforcement test
    infinite_code = "import time\ntime.sleep(10)"
    res_timeout = client.post(
        "/api/v1/runner/execute",
        headers=headers,
        json={"code": infinite_code, "language": "python"}
    )
    assert res_timeout.status_code == 200
    timeout_data = res_timeout.json()
    assert timeout_data["exit_code"] == -1
    assert "timed out" in timeout_data["stderr"]

def test_github_and_diagram_integration(client: TestClient):
    login_res = client.post("/api/v1/auth/demo-login")
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create a project
    proj_res = client.post(
        "/api/v1/projects/",
        headers=headers,
        json={
            "name": "DevOps Hub Project",
            "description": "Project with GitHub & Diagram features"
        }
    )
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # Test updating GitHub repo
    gh_update_res = client.put(
        f"/api/v1/projects/{proj_id}/github",
        headers=headers,
        json={"github_repo": "Hardik144/CloudDocs"}
    )
    assert gh_update_res.status_code == 200
    assert gh_update_res.json()["github_repo"] == "Hardik144/CloudDocs"

    # Test getting GitHub status
    gh_status_res = client.get(
        f"/api/v1/projects/{proj_id}/github/status",
        headers=headers
    )
    assert gh_status_res.status_code == 200
    gh_status = gh_status_res.json()
    assert gh_status["connected"] is True
    assert gh_status["repo"] == "Hardik144/CloudDocs"

    # Test getting Diagram
    diagram_res = client.get(
        f"/api/v1/projects/{proj_id}/diagram",
        headers=headers
    )
    assert diagram_res.status_code == 200
    diagram_data = diagram_res.json()
    assert "graph TD" in diagram_data["diagram_syntax"]

    # Test updating Diagram
    custom_syntax = "graph LR\n  A[Frontend] --> B[API Gateway] --> C[(DB)]"
    diag_put_res = client.put(
        f"/api/v1/projects/{proj_id}/diagram",
        headers=headers,
        json={"diagram_syntax": custom_syntax}
    )
    assert diag_put_res.status_code == 200
    assert diag_put_res.json()["diagram_syntax"] == custom_syntax

    # Verify updated diagram persists
    verify_res = client.get(
        f"/api/v1/projects/{proj_id}/diagram",
        headers=headers
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["diagram_syntax"] == custom_syntax
