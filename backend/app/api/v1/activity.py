from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.collaboration import Activity
from app.models.project import ProjectMember
from app.schemas.collaboration import ActivityResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[ActivityResponse])
def get_activities(
    project_id: Optional[str] = None,
    limit: int = 25,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Activity)
    if project_id:
        q = q.filter(Activity.project_id == project_id)
    else:
        # Across all projects the user is a member of
        p_sub = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
        q = q.filter(Activity.project_id.in_(p_sub))

    return q.order_by(Activity.created_at.desc()).limit(limit).all()
