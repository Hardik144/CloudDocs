import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.user import User
from app.models.document import Document, DocumentVersion
from app.core.security import get_password_hash, create_access_token
from app.services.storage import storage_provider

@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c

def test_visual_diff_between_versions(client):
    db = SessionLocal()
    user = db.query(User).filter(User.email == "diff_tester@clouddocs.io").first()
    if not user:
        user = User(
            email="diff_tester@clouddocs.io",
            name="Diff Tester",
            password_hash=get_password_hash("password123"),
            status="active"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    user_id = user.id

    # Create document
    v1_key = f"docs/{user_id}/v1_note.md"
    v2_key = f"docs/{user_id}/v2_note.md"
    storage_provider.save_file(v1_key, b"# CloudDocs Guide\nThis is version 1 of our cloud guide.\nStep 1: Install Docker\nStep 2: Run docker compose\n", "text/markdown")
    storage_provider.save_file(v2_key, b"# CloudDocs Guide\nThis is version 2 of our cloud guide with improvements.\nStep 1: Install Docker\nStep 2: Run docker compose\nStep 3: Access Grafana on 3001\n", "text/markdown")

    doc = Document(
        name="guide.md",
        owner_id=user_id,
        storage_key=v2_key,
        mime_type="text/markdown",
        file_size=160,
        current_version=2
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    doc_id = doc.id

    v1 = DocumentVersion(
        document_id=doc_id,
        version_number=1,
        storage_key=v1_key,
        file_size=100,
        uploader_id=user_id
    )
    v2 = DocumentVersion(
        document_id=doc_id,
        version_number=2,
        storage_key=v2_key,
        file_size=160,
        uploader_id=user_id
    )
    db.add_all([v1, v2])
    db.commit()
    db.close()

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch visual diff
    res = client.get(f"/api/v1/documents/{doc_id}/diff?v1=1&v2=2", headers=headers)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["v1_number"] == 1
    assert data["v2_number"] == 2
    assert data["additions"] > 0
    assert len(data["diff_lines"]) > 0
    assert any(line["type"] == "insert" and "Step 3" in line["content"] for line in data["diff_lines"])

def test_password_protected_and_burn_after_reading_share_link(client):
    db = SessionLocal()
    user = db.query(User).filter(User.email == "diff_tester@clouddocs.io").first()
    user_id = user.id
    doc = db.query(Document).filter(Document.owner_id == user_id).first()
    doc_id = doc.id
    db.close()

    token = create_access_token(subject=user_id)
    headers = {"Authorization": f"Bearer {token}"}

    # Create password-protected and burn-after-reading link
    share_res = client.post(
        f"/api/v1/documents/{doc_id}/share-link",
        headers=headers,
        json={
            "permission_level": "viewer",
            "expires_in_hours": 1,
            "password": "super-secret-password",
            "burn_after_reading": True
        }
    )
    assert share_res.status_code == 200, share_res.text
    share_data = share_res.json()
    share_token = share_data["token"]
    assert share_data["has_password"] is True
    assert share_data["burn_after_reading"] is True

    # 1. Anonymous user views metadata
    meta_res = client.get(f"/api/v1/documents/shared/{share_token}")
    assert meta_res.status_code == 200
    meta = meta_res.json()
    assert meta["has_password"] is True
    assert meta["burn_after_reading"] is True

    # 2. Try unlocking with wrong password
    wrong_unlock = client.post(
        f"/api/v1/documents/shared/{share_token}/unlock",
        json={"password": "wrong-password"}
    )
    assert wrong_unlock.status_code == 401

    # 3. Unlock with correct password
    correct_unlock = client.post(
        f"/api/v1/documents/shared/{share_token}/unlock",
        json={"password": "super-secret-password"}
    )
    assert correct_unlock.status_code == 200
    unlocked = correct_unlock.json()
    assert "download_url" in unlocked
    assert unlocked["burned"] is True

    # 4. Try unlocking again (should fail because single-use link was burned)
    burned_unlock = client.post(
        f"/api/v1/documents/shared/{share_token}/unlock",
        json={"password": "super-secret-password"}
    )
    assert burned_unlock.status_code == 410
