import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite:///./test_clouddocs.db"
os.environ["STORAGE_PROVIDER"] = "local"
os.environ["LOCAL_STORAGE_DIR"] = tempfile.mkdtemp()
os.environ["METRICS_ENABLED"] = "true"

from app.core.database import Base, get_db, engine
from app.main import app

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_clouddocs.db"):
        os.remove("./test_clouddocs.db")

@pytest.fixture
def client():
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
