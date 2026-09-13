from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.project import Project, ProjectMember, MemberRole, ProjectStatus, Milestone
from app.models.project_archive import ProjectArchive
from app.models.user import User
from app.models.document import Document
from app.models.task import Task
from app.schemas.project import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    ProjectMemberCreate, ProjectMemberUpdate, ProjectMemberResponse,
    ProjectHealthScore, ProjectArchiveResponse, ProjectArchiveSummary,
    GitHubRepoUpdate, GitHubStatusResponse, DiagramUpdate
)
from app.api.deps import get_current_user
from app.services.health_score import calculate_project_health
from app.services.audit_service import log_audit_event, log_activity_event, create_user_notification
from app.services.storage import storage_provider
from app.services.archive_service import parse_archive_bytes, read_file_from_archive
from fastapi import UploadFile, File, Form, Response, Query

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

# --- Project Code & Repository Archive Endpoints ---

@router.post("/{id}/archives/upload", response_model=ProjectArchiveResponse)
async def upload_project_archive(
    id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if role not in [MemberRole.OWNER.value, MemberRole.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Must be project owner or editor to upload code archives")

    filename = file.filename or "archive.zip"
    ext = filename.lower()
    if not (ext.endswith(".zip") or ext.endswith(".tar.gz") or ext.endswith(".tgz") or ext.endswith(".tar")):
        raise HTTPException(status_code=400, detail="Only .zip and .tar.gz / .tgz project archives are supported")

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    archive_type = "zip" if ext.endswith(".zip") else "tar.gz"

    try:
        tree, total_files, total_dirs = parse_archive_bytes(content, filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    storage_key = f"projects/{project.id}/archives/{filename}"
    mime_type = file.content_type or "application/zip"
    saved = storage_provider.save_file(storage_key, content, mime_type)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to store project archive")

    archive = ProjectArchive(
        project_id=project.id,
        uploaded_by_id=current_user.id,
        name=filename,
        storage_key=storage_key,
        archive_type=archive_type,
        file_size=len(content),
        total_files=total_files,
        total_dirs=total_dirs,
        description=description,
        file_tree=tree
    )
    db.add(archive)
    db.commit()
    db.refresh(archive)

    log_activity_event(
        db=db,
        actor_id=current_user.id,
        action="archive.uploaded",
        entity_type="project_archive",
        entity_id=archive.id,
        description=f"Uploaded project archive {archive.name}",
        project_id=project.id
    )

    return archive

@router.get("/{id}/archives", response_model=List[ProjectArchiveSummary])
def list_project_archives(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    archives = db.query(ProjectArchive).filter(
        ProjectArchive.project_id == id
    ).order_by(ProjectArchive.created_at.desc()).all()
    return archives

@router.get("/{id}/archives/{archive_id}", response_model=ProjectArchiveResponse)
def get_project_archive(
    id: str,
    archive_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    archive = db.query(ProjectArchive).filter(
        ProjectArchive.id == archive_id,
        ProjectArchive.project_id == id
    ).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Project archive not found")

    return archive

@router.get("/{id}/archives/{archive_id}/file")
def view_archive_file(
    id: str,
    archive_id: str,
    path: str = Query(..., description="Relative path of file inside archive"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    archive = db.query(ProjectArchive).filter(
        ProjectArchive.id == archive_id,
        ProjectArchive.project_id == id
    ).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Project archive not found")

    archive_bytes = storage_provider.get_file_bytes(archive.storage_key)
    if not archive_bytes:
        raise HTTPException(status_code=404, detail="Archive file not found in storage")

    try:
        result = read_file_from_archive(archive_bytes, archive.name, path)
        return result
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}/archives/{archive_id}/download")
def download_archive(
    id: str,
    archive_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    archive = db.query(ProjectArchive).filter(
        ProjectArchive.id == archive_id,
        ProjectArchive.project_id == id
    ).first()
    if not archive:
        raise HTTPException(status_code=404, detail="Project archive not found")

    archive_bytes = storage_provider.get_file_bytes(archive.storage_key)
    if not archive_bytes:
        raise HTTPException(status_code=404, detail="Archive file not found in storage")

    media_type = "application/zip" if archive.archive_type == "zip" else "application/gzip"
    return Response(
        content=archive_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{archive.name}"'}
    )

# --- GitHub Integration Endpoints ---

@router.put("/{id}/github", response_model=ProjectResponse)
def update_project_github(
    id: str,
    payload: GitHubRepoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if not role or role not in [MemberRole.OWNER.value, MemberRole.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Only project owners and editors can update repository settings")

    # Clean repo string if provided (e.g., strip URL parts)
    repo = payload.github_repo.strip() if payload.github_repo else None
    if repo:
        repo = repo.replace("https://github.com/", "").replace("http://github.com/", "").strip("/")

    project.github_repo = repo
    db.commit()
    db.refresh(project)
    return project

@router.get("/{id}/github/status", response_model=GitHubStatusResponse)
def get_project_github_status(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import httpx
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    if not project.github_repo:
        return GitHubStatusResponse(connected=False)

    repo = project.github_repo
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CloudDocs-App"
    }

    latest_commit = None
    latest_workflow = None
    error_msg = None

    try:
        with httpx.Client(timeout=4.0) as client:
            # 1. Fetch latest commit
            commit_res = client.get(f"https://api.github.com/repos/{repo}/commits?per_page=1", headers=headers)
            if commit_res.status_code == 200:
                commits_data = commit_res.json()
                if commits_data and isinstance(commits_data, list):
                    c = commits_data[0]
                    latest_commit = {
                        "sha": c.get("sha", "")[:7],
                        "full_sha": c.get("sha", ""),
                        "message": c.get("commit", {}).get("message", "").split("\n")[0],
                        "author": c.get("commit", {}).get("author", {}).get("name", ""),
                        "date": c.get("commit", {}).get("author", {}).get("date", ""),
                        "url": c.get("html_url", "")
                    }
            elif commit_res.status_code == 404:
                error_msg = f"Repository '{repo}' not found or is private."
            elif commit_res.status_code == 403:
                error_msg = "GitHub API rate limit exceeded. Showing cached or reconnect later."

            # 2. Fetch latest workflow run (CI/CD)
            runs_res = client.get(f"https://api.github.com/repos/{repo}/actions/runs?per_page=1", headers=headers)
            if runs_res.status_code == 200:
                runs_data = runs_res.json()
                workflow_runs = runs_data.get("workflow_runs", [])
                if workflow_runs:
                    run = workflow_runs[0]
                    latest_workflow = {
                        "id": run.get("id"),
                        "name": run.get("name"),
                        "status": run.get("status"), # completed, in_progress, queued
                        "conclusion": run.get("conclusion"), # success, failure, neutral, cancelled
                        "branch": run.get("head_branch"),
                        "event": run.get("event"),
                        "html_url": run.get("html_url"),
                        "updated_at": run.get("updated_at")
                    }
    except Exception as e:
        error_msg = f"Could not reach GitHub API: {str(e)}"

    return GitHubStatusResponse(
        connected=True,
        repo=repo,
        latest_commit=latest_commit,
        latest_workflow=latest_workflow,
        error=error_msg
    )

# --- Architecture Diagram Endpoints ---

@router.get("/{id}/diagram")
def get_project_diagram(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not get_user_project_role(project, current_user.id, db):
        raise HTTPException(status_code=403, detail="Access denied")

    default_template = """graph TD
    Client[Web Browser / Client] --> Nginx[Nginx Reverse Proxy :80]
    Nginx --> Frontend[Next.js 14 App :3000]
    Nginx --> Backend[FastAPI Python :8000]
    Backend --> Postgres[(PostgreSQL 16)]
    Backend --> Redis[(Redis 7 Cache)]
    Backend --> Storage[(Local Volume / R2 Storage)]"""

    return {
        "diagram_syntax": project.diagram_syntax or default_template
    }

@router.put("/{id}/diagram")
def update_project_diagram(
    id: str,
    payload: DiagramUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    role = get_user_project_role(project, current_user.id, db)
    if not role or role in [MemberRole.VIEWER.value]:
        raise HTTPException(status_code=403, detail="Viewers cannot edit the architecture diagram")

    project.diagram_syntax = payload.diagram_syntax
    db.commit()
    db.refresh(project)

    log_activity_event(
        db=db,
        project_id=project.id,
        actor_id=current_user.id,
        action="diagram.updated",
        entity_type="diagram",
        entity_id=project.id,
        description=f"Updated architecture diagram for {project.name}"
    )

    return {"message": "Architecture diagram updated successfully", "diagram_syntax": project.diagram_syntax}

