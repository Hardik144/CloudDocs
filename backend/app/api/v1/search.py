from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.document import Document
from app.models.project import Project, ProjectMember
from app.models.task import Task
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/")
def global_search(
    q: str = Query(..., min_length=1),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    search_pat = f"%{q}%"

    # User project IDs
    p_sub = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()

    # 1. Documents
    docs = db.query(Document).filter(
        Document.is_deleted == False,
        or_(Document.owner_id == current_user.id, Document.project_id.in_(p_sub)),
        or_(Document.name.ilike(search_pat), Document.description.ilike(search_pat))
    ).limit(limit).all()

    # 2. Projects
    projects = db.query(Project).filter(
        or_(Project.owner_id == current_user.id, Project.id.in_(p_sub)),
        or_(Project.name.ilike(search_pat), Project.description.ilike(search_pat))
    ).limit(limit).all()

    # 3. Tasks
    tasks = db.query(Task).filter(
        Task.project_id.in_(p_sub),
        or_(Task.title.ilike(search_pat), Task.description.ilike(search_pat))
    ).limit(limit).all()

    return {
        "query": q,
        "results": {
            "documents": [
                {
                    "id": d.id,
                    "name": d.name,
                    "mime_type": d.mime_type,
                    "project_id": d.project_id,
                    "current_version": d.current_version
                }
                for d in docs
            ],
            "projects": [
                {
                    "id": p.id,
                    "name": p.name,
                    "status": p.status,
                    "priority": p.priority
                }
                for p in projects
            ],
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "project_id": t.project_id
                }
                for t in tasks
            ]
        }
    }
