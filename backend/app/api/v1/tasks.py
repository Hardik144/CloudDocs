from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.task import Task, TaskStatus
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.api.deps import get_current_user
from app.services.audit_service import log_activity_event, create_user_notification

router = APIRouter()

@router.get("/", response_model=List[TaskResponse])
def list_tasks(
    project_id: Optional[str] = None,
    assigned_to_me: Optional[bool] = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(Task)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if assigned_to_me:
        q = q.filter(Task.assignee_id == current_user.id)
    else:
        # User must belong to the project or be creator/assignee
        member_pids = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
        q = q.filter(Task.project_id.in_(member_pids))

    return q.order_by(Task.created_at.desc()).all()

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    task_in: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == task_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task = Task(
        project_id=task_in.project_id,
        title=task_in.title,
        description=task_in.description,
        creator_id=current_user.id,
        assignee_id=task_in.assignee_id,
        status=task_in.status,
        priority=task_in.priority,
        due_date=task_in.due_date
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    log_activity_event(
        db=db,
        project_id=project.id,
        actor_id=current_user.id,
        action="task.created",
        entity_type="task",
        entity_id=task.id,
        description=f"{current_user.name} created task '{task.title}'"
    )

    if task.assignee_id and task.assignee_id != current_user.id:
        create_user_notification(
            db=db,
            recipient_id=task.assignee_id,
            title="Task Assigned",
            message=f"You were assigned to '{task.title}' in {project.name}",
            link=f"/projects/{project.id}"
        )

    return task

@router.get("/{id}", response_model=TaskResponse)
def get_task(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{id}", response_model=TaskResponse)
def update_task(
    id: str,
    task_in: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    status_changed = False
    old_status = task.status

    if task_in.title is not None:
        task.title = task_in.title
    if task_in.description is not None:
        task.description = task_in.description
    if task_in.status is not None and task_in.status != task.status:
        task.status = task_in.status
        status_changed = True
    if task_in.priority is not None:
        task.priority = task_in.priority
    if task_in.due_date is not None:
        task.due_date = task_in.due_date
    if task_in.assignee_id is not None:
        task.assignee_id = task_in.assignee_id

    db.commit()
    db.refresh(task)

    if status_changed:
        log_activity_event(
            db=db,
            project_id=task.project_id,
            actor_id=current_user.id,
            action="task.status_changed",
            entity_type="task",
            entity_id=task.id,
            description=f"{current_user.name} moved task '{task.title}' to {task.status.upper()}"
        )

    return task

@router.delete("/{id}")
def delete_task(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}
