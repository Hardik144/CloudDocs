from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.project import Project, ProjectMember, MemberRole, ProjectStatus, Milestone
from app.models.user import User
from app.models.document import Document
from app.models.task import Task
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectMemberCreate, ProjectMemberUpdate, ProjectMemberResponse,
    ProjectHealthScore
)
from app.api.deps import get_current_user
from app.services.health_score import calculate_project_health
from app.services.audit_service import log_audit_event, log_activity_event, create_user_notification

router = APIRouter()

def get_user_project_role(project: Project, user_id: str, db: Session) -> Optional[str]:
    if project.owner_id == user_id:
        return MemberRole.OWNER.value
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == user_id
    ).first()
    return member.role if member else None

@router.get("/", response_model=List[ProjectResponse])
def list_projects(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find all project IDs where user is member or owner
    member_project_ids = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
    q = db.query(Project).filter(
        or_(Project.owner_id == current_user.id, Project.id.in_(member_project_ids))
    )
    if status:
        q = q.filter(Project.status == status)

    projects = q.order_by(Project.updated_at.desc()).all()
    results = []
    for p in projects:
        m_count = db.query(ProjectMember).filter(ProjectMember.project_id == p.id).count()
        d_count = db.query(Document).filter(Document.project_id == p.id, Document.is_deleted == False).count()
        t_count = db.query(Task).filter(Task.project_id == p.id).count()
        health = calculate_project_health(p.id, db)
        
        proj_resp = ProjectResponse.model_validate(p)
        proj_resp.members_count = m_count
        proj_resp.documents_count = d_count
        proj_resp.tasks_count = t_count
        proj_resp.health = health
        results.append(proj_resp)
    return results

@router.post("/", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        name=project_in.name,
        description=project_in.description,
        owner_id=current_user.id,
        status=project_in.status,
        priority=project_in.priority,
        start_date=project_in.start_date,
        end_date=project_in.end_date
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Automatically add owner as ProjectMember
    owner_member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role=MemberRole.OWNER.value
    )
    db.add(owner_member)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="project.created",
        resource_type="project",
        resource_id=project.id,
        metadata={"name": project.name}
    )

    log_activity_event(
        db=db,
        project_id=project.id,
        actor_id=current_user.id,
        action="project.created",
        entity_type="project",
        entity_id=project.id,
        description=f"{current_user.name} created project '{project.name}'"
    )

    resp = ProjectResponse.model_validate(project)
    resp.members_count = 1
    resp.documents_count = 0
    resp.tasks_count = 0
    resp.health = calculate_project_health(project.id, db)
    return resp

@router.get("/{id}", response_model=ProjectResponse)
def get_project(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if not role:
        raise HTTPException(status_code=403, detail="You do not have access to this project")

    m_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()
    d_count = db.query(Document).filter(Document.project_id == project.id, Document.is_deleted == False).count()
    t_count = db.query(Task).filter(Task.project_id == project.id).count()
    health = calculate_project_health(project.id, db)

    resp = ProjectResponse.model_validate(project)
    resp.members_count = m_count
    resp.documents_count = d_count
    resp.tasks_count = t_count
    resp.health = health
    return resp

@router.put("/{id}", response_model=ProjectResponse)
def update_project(
    id: str,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if role not in [MemberRole.OWNER.value, MemberRole.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied to update project")

    if project_in.name is not None:
        project.name = project_in.name
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.status is not None:
        project.status = project_in.status
    if project_in.priority is not None:
        project.priority = project_in.priority
    if project_in.start_date is not None:
        project.start_date = project_in.start_date
    if project_in.end_date is not None:
        project.end_date = project_in.end_date

    db.commit()
    db.refresh(project)

    log_activity_event(
        db=db,
        project_id=project.id,
        actor_id=current_user.id,
        action="project.updated",
        entity_type="project",
        entity_id=project.id,
        description=f"{current_user.name} updated project details"
    )

    resp = ProjectResponse.model_validate(project)
    resp.health = calculate_project_health(project.id, db)
    return resp

@router.delete("/{id}")
def delete_project(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only project owner can delete this project")

    db.delete(project)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="project.deleted",
        resource_type="project",
        resource_id=id
    )

    return {"message": "Project deleted successfully"}

@router.get("/{id}/members", response_model=List[ProjectMemberResponse])
def list_project_members(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    members = db.query(ProjectMember).filter(ProjectMember.project_id == id).all()
    return members

@router.post("/{id}/members", response_model=ProjectMemberResponse)
def add_project_member(
    id: str,
    member_in: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if role not in [MemberRole.OWNER.value, MemberRole.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied to add members")

    target_user = db.query(User).filter(User.email == member_in.user_email.lower()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User with this email not found")

    existing = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == target_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    new_member = ProjectMember(
        project_id=id,
        user_id=target_user.id,
        role=member_in.role
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    log_activity_event(
        db=db,
        project_id=project.id,
        actor_id=current_user.id,
        action="member.added",
        entity_type="member",
        entity_id=new_member.id,
        description=f"{current_user.name} invited {target_user.name} as {member_in.role}"
    )

    create_user_notification(
        db=db,
        recipient_id=target_user.id,
        title="Project Invitation",
        message=f"You were added to project '{project.name}' as a {member_in.role}",
        link=f"/projects/{project.id}"
    )

    return new_member

@router.delete("/{id}/members/{user_id}")
def remove_project_member(
    id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id != current_user.id and user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Permission denied to remove member")

    if user_id == project.owner_id:
        raise HTTPException(status_code=400, detail="Cannot remove the project owner")

    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == id,
        ProjectMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in project")

    db.delete(member)
    db.commit()
    return {"message": "Member removed from project"}

@router.get("/{id}/health", response_model=ProjectHealthScore)
def get_project_health(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    return calculate_project_health(id, db)
