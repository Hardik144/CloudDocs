from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.collaboration import AuditLog
from app.schemas.collaboration import AuditLogResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(AuditLog)
    if current_user.role != "admin":
        q = q.filter(AuditLog.actor_id == current_user.id)
    if action:
        q = q.filter(AuditLog.action == action)

    return q.order_by(AuditLog.timestamp.desc()).limit(limit).all()
