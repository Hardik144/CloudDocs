from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class HealthCheckResponse(BaseModel):
    status: str # "healthy" or "unhealthy"
    database: str
    redis: str
    storage: str
    timestamp: datetime
    version: str = "1.0.0"

class DevOpsStatusResponse(BaseModel):
    app_version: str
    environment: str
    git_commit_sha: Optional[str] = None
    git_branch: Optional[str] = None
    docker_image: str
    backend_status: str
    database_status: str
    redis_status: str
    storage_provider: str
    ci_cd_provider: str
    ci_cd_status: str # "Integration not configured" or real status
    security_scan_status: str # "Integration not configured" or real status
    metrics_enabled: bool
    active_connections: int
