import pytest
import io
import zipfile
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.project import Project
from app.core.security import get_password_hash, create_access_token

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

def test_project_archive_upload_inspect_and_download(client):
    db = SessionLocal()
    # Create test user & project
    user = db.query(User).filter(User.email == "archive_tester@clouddocs.io").first()
    if not user:
        user = User(
            email="archive_tester@clouddocs.io",
            name="Archive Tester",
            password_hash=get_password_hash("password123"),
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    project = Project(
        name="Archive Test App",
        owner_id=user.id,
        status="active"
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    project_id = project.id
    user_id = user.id
    db.close()

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Build an in-memory zip archive with project source code
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        z.writestr("src/main.py", "print('Hello CloudDocs Repository!')\n")
        z.writestr("src/utils.py", "def add(a, b):\n    return a + b\n")
        z.writestr("README.md", "# Sample App\nThis is a full project archive test.\n")
    zip_bytes = zip_buffer.getvalue()

    # 1. Upload the project archive
    files = {"file": ("my-sample-repo.zip", zip_bytes, "application/zip")}
    upload_res = client.post(
        f"/api/v1/projects/{project_id}/archives/upload",
        headers=headers,
        files=files,
        data={"description": "Test initial repository upload"}
    )
    assert upload_res.status_code == 200, upload_res.text
    archive_data = upload_res.json()
    assert archive_data["name"] == "my-sample-repo.zip"
    assert archive_data["total_files"] == 3
    assert "file_tree" in archive_data
    archive_id = archive_data["id"]

    # 2. List archives for project
    list_res = client.get(f"/api/v1/projects/{project_id}/archives", headers=headers)
    assert list_res.status_code == 200
    archives = list_res.json()
    assert len(archives) >= 1
    assert any(a["id"] == archive_id for a in archives)

    # 3. View a file in the archive
    file_res = client.get(
        f"/api/v1/projects/{project_id}/archives/{archive_id}/file?path=src/main.py",
        headers=headers
    )
    assert file_res.status_code == 200
    file_data = file_res.json()
    assert file_data["is_binary"] is False
    assert "Hello CloudDocs Repository!" in file_data["content"]

    # 4. Download archive
    dl_res = client.get(
        f"/api/v1/projects/{project_id}/archives/{archive_id}/download",
        headers=headers
    )
    assert dl_res.status_code == 200
    assert dl_res.content == zip_bytes
