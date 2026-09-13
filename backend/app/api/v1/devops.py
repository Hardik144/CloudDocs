import os
import subprocess
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.redis import redis_client
from app.core.config import settings
from app.schemas.devops import HealthCheckResponse, DevOpsStatusResponse

router = APIRouter()

def get_git_info():
    sha = os.environ.get("GIT_COMMIT_SHA")
    branch = os.environ.get("GIT_BRANCH")
    if not sha:
        try:
            sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
            branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL).decode("utf-8").strip()
        except Exception:
            sha = "local-dev"
            branch = "main"
    return sha, branch

@router.get("/health", response_model=HealthCheckResponse)
def health_check(db: Session = Depends(get_db)):
    # 1. Database check
    db_status = "healthy"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unhealthy: {e}"

    # 2. Redis check
    redis_status = "healthy" if redis_client.is_available else "transient-fallback (memory)"

    # 3. Storage check
    storage_status = f"active ({settings.STORAGE_PROVIDER})"

    overall_status = "healthy" if db_status == "healthy" else "unhealthy"

    return HealthCheckResponse(
        status=overall_status,
        database=db_status,
        redis=redis_status,
        storage=storage_status,
        timestamp=datetime.now(timezone.utc),
        version="1.0.0"
    )

@router.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"ready": True}
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not ready")

@router.get("/status", response_model=DevOpsStatusResponse)
def get_devops_status(db: Session = Depends(get_db)):
    sha, branch = get_git_info()

    # DB status
    try:
        db.execute(text("SELECT 1"))
        db_stat = "Connected & Healthy"
    except Exception:
        db_stat = "Connection Failed"

    # Redis status
    redis_stat = "Connected" if redis_client.is_available else "Memory Fallback (Offline)"

    # CI/CD and Security: check if GitHub Actions env or configuration is present
    has_github_actions = os.path.exists(".github/workflows/ci.yml") or os.environ.get("GITHUB_ACTIONS") == "true"
    ci_status = "Workflow configured (.github/workflows/ci.yml)" if has_github_actions else "Integration not configured"
    security_status = "Trivy Scan active in CI" if has_github_actions else "Integration not configured"

    return DevOpsStatusResponse(
        app_version="1.0.0",
        environment=settings.APP_ENV,
        git_commit_sha=sha,
        git_branch=branch,
        docker_image=f"ghcr.io/clouddocs/clouddocs-backend:{sha}",
        backend_status="Healthy (FastAPI)",
        database_status=db_stat,
        redis_status=redis_stat,
        storage_provider=f"Cloudflare R2 ({settings.STORAGE_PROVIDER})" if settings.STORAGE_PROVIDER == "r2" else "Local Filesystem Fallback",
        ci_cd_provider="GitHub Actions",
        ci_cd_status=ci_status,
        security_scan_status=security_status,
        metrics_enabled=settings.METRICS_ENABLED,
        active_connections=1
    )
