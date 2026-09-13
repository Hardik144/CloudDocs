from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.project import Milestone, Project
from app.schemas.project import MilestoneCreate, MilestoneUpdate, MilestoneResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/project/{project_id}", response_model=List[MilestoneResponse])
def list_milestones(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Milestone).filter(Milestone.project_id == project_id).order_by(Milestone.created_at.asc()).all()

@router.post("/project/{project_id}", response_model=MilestoneResponse, status_code=status.HTTP_201_CREATED)
def create_milestone(
    project_id: str,
    m_in: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    milestone = Milestone(
        project_id=project_id,
        title=m_in.title,
        description=m_in.description,
        due_date=m_in.due_date,
        status=m_in.status,
        progress_pct=m_in.progress_pct
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone

@router.put("/{id}", response_model=MilestoneResponse)
def update_milestone(
    id: str,
    m_in: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    milestone = db.query(Milestone).filter(Milestone.id == id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    if m_in.title is not None:
        milestone.title = m_in.title
    if m_in.description is not None:
        milestone.description = m_in.description
    if m_in.due_date is not None:
        milestone.due_date = m_in.due_date
    if m_in.status is not None:
        milestone.status = m_in.status
    if m_in.progress_pct is not None:
        milestone.progress_pct = m_in.progress_pct
        if milestone.progress_pct == 100:
            milestone.status = "completed"

    db.commit()
    db.refresh(milestone)
    return milestone

@router.delete("/{id}")
def delete_milestone(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    milestone = db.query(Milestone).filter(Milestone.id == id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    db.delete(milestone)
    db.commit()
    return {"message": "Milestone deleted"}
