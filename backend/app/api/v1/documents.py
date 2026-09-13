import os
import uuid
import secrets
import difflib
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.document import (
    Document, DocumentVersion, DocumentPermission, ShareLink, DocumentPermissionLevel
)
from app.models.project import Project, ProjectMember, MemberRole
from app.models.user import User
from app.schemas.document import (
    DocumentUploadRequest, DocumentUploadAuthResponse, DocumentCompleteUpload,
    DocumentResponse, DocumentVersionResponse, DocumentVersionCreate,
    DocumentPermissionCreate, DocumentPermissionResponse,
    ShareLinkCreate, ShareLinkResponse, DocumentUpdate, DocumentTextContentUpdate,
    DocumentDiffResponse, DiffLine, ShareLinkVerifyRequest
)
from app.api.deps import get_current_user, get_optional_user
from app.services.storage import storage_provider
from app.services.audit_service import log_audit_event, log_activity_event, create_user_notification

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "pdf", "docx", "xlsx", "pptx", "txt", "csv", "md", "json", "png", "jpg", "jpeg", "webp", "zip"
}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB

def get_document_permission(doc: Document, user_id: str, db: Session) -> Optional[str]:
    if doc.owner_id == user_id:
        return DocumentPermissionLevel.OWNER.value
    
    # Check explicit document permission
    perm = db.query(DocumentPermission).filter(
        DocumentPermission.document_id == doc.id,
        DocumentPermission.user_id == user_id
    ).first()
    if perm:
        return perm.permission_level
    
    # Check project role if doc belongs to project
    if doc.project_id:
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == doc.project_id,
            ProjectMember.user_id == user_id
        ).first()
        if member:
            return member.role
            
    return None

@router.post("/request-upload", response_model=DocumentUploadAuthResponse)
def request_upload(
    upload_req: DocumentUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    ext = upload_req.filename.rsplit(".", 1)[-1].lower() if "." in upload_req.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File extension '{ext}' is not supported")

    # Validate size
    if upload_req.file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 100 MB")

    # If project_id is given, check member permission
    if upload_req.project_id:
        project = db.query(Project).filter(Project.id == upload_req.project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        member = db.query(ProjectMember).filter(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == current_user.id
        ).first()
        if not member and project.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to upload to this project")

    # Generate safe randomized storage key: docs/{user_id}/{uuid}.{ext}
    safe_key = f"docs/{current_user.id}/{uuid.uuid4().hex}_{secrets.token_hex(4)}.{ext}"
    auth_data = storage_provider.generate_upload_url(safe_key, upload_req.mime_type)

    return DocumentUploadAuthResponse(
        upload_url=auth_data["upload_url"],
        storage_key=safe_key,
        method=auth_data.get("method", "PUT"),
        headers=auth_data.get("headers", {}),
        is_direct_r2=auth_data.get("is_direct_r2", False)
    )

@router.post("/complete-upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
def complete_upload(
    comp_in: DocumentCompleteUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = Document(
        name=comp_in.name,
        description=comp_in.description,
        project_id=comp_in.project_id,
        owner_id=current_user.id,
        storage_key=comp_in.storage_key,
        mime_type=comp_in.mime_type,
        file_size=comp_in.file_size,
        current_version=1,
        checksum=comp_in.checksum
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    # Create Version 1
    v1 = DocumentVersion(
        document_id=doc.id,
        version_number=1,
        storage_key=comp_in.storage_key,
        file_size=comp_in.file_size,
        checksum=comp_in.checksum,
        change_description=comp_in.change_description or "Initial upload",
        uploader_id=current_user.id
    )
    db.add(v1)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="document.uploaded",
        resource_type="document",
        resource_id=doc.id,
        metadata={"filename": doc.name, "size": doc.file_size}
    )

    if doc.project_id:
        log_activity_event(
            db=db,
            project_id=doc.project_id,
            actor_id=current_user.id,
            action="document.uploaded",
            entity_type="document",
            entity_id=doc.id,
            description=f"{current_user.name} uploaded document '{doc.name}'"
        )

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = DocumentPermissionLevel.OWNER.value
    return resp

@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    project_id: Optional[str] = None,
    starred: Optional[bool] = None,
    trash: Optional[bool] = False,
    query: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find accessible documents: owned or shared or in user's projects
    user_project_ids = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == current_user.id).subquery()
    shared_doc_ids = db.query(DocumentPermission.document_id).filter(DocumentPermission.user_id == current_user.id).subquery()

    q = db.query(Document).filter(
        or_(
            Document.owner_id == current_user.id,
            Document.id.in_(shared_doc_ids),
            Document.project_id.in_(user_project_ids)
        )
    )

    if trash:
        q = q.filter(Document.is_deleted == True)
    else:
        q = q.filter(Document.is_deleted == False)

    if project_id:
        q = q.filter(Document.project_id == project_id)

    if starred is not None:
        q = q.filter(Document.is_starred == starred)

    if query:
        search_pattern = f"%{query}%"
        q = q.filter(Document.name.ilike(search_pattern))

    docs = q.order_by(Document.updated_at.desc()).all()
    results = []
    for d in docs:
        resp = DocumentResponse.model_validate(d)
        resp.download_url = storage_provider.generate_download_url(d.storage_key, filename=d.name)
        resp.preview_url = storage_provider.generate_download_url(d.storage_key)
        resp.user_permission = get_document_permission(d, current_user.id, db)
        results.append(resp)
    return results

@router.get("/{id}", response_model=DocumentResponse)
def get_document(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if not perm:
        raise HTTPException(status_code=403, detail="Access denied to this document")

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = perm
    return resp

@router.get("/{id}/content", response_class=PlainTextResponse)
def get_document_text_content(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if not perm:
        raise HTTPException(status_code=403, detail="Access denied")

    content_bytes = storage_provider.get_file_bytes(doc.storage_key)
    if content_bytes is None:
        raise HTTPException(status_code=404, detail="File content not found in storage")

    try:
        return content_bytes.decode("utf-8")
    except Exception:
        raise HTTPException(status_code=400, detail="Document is not text-editable")

@router.put("/{id}/content", response_model=DocumentResponse)
def save_document_text_content(
    id: str,
    edit_in: DocumentTextContentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if perm not in [DocumentPermissionLevel.OWNER.value, DocumentPermissionLevel.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Editor permission required to save document changes")

    content_bytes = edit_in.content.encode("utf-8")
    ext = doc.name.rsplit(".", 1)[-1] if "." in doc.name else "txt"
    new_version_num = doc.current_version + 1
    new_storage_key = f"docs/{doc.owner_id}/{doc.id}_v{new_version_num}.{ext}"

    storage_provider.save_file(new_storage_key, content_bytes, mime_type=doc.mime_type)

    doc.storage_key = new_storage_key
    doc.file_size = len(content_bytes)
    doc.current_version = new_version_num
    db.commit()

    # Record Version
    version_record = DocumentVersion(
        document_id=doc.id,
        version_number=new_version_num,
        storage_key=new_storage_key,
        file_size=len(content_bytes),
        change_description=edit_in.change_description,
        uploader_id=current_user.id
    )
    db.add(version_record)
    db.commit()
    db.refresh(doc)

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="document.edited_browser",
        resource_type="document",
        resource_id=doc.id,
        metadata={"version": new_version_num}
    )

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = perm
    return resp

@router.put("/{id}", response_model=DocumentResponse)
def update_document(
    id: str,
    doc_in: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if perm not in [DocumentPermissionLevel.OWNER.value, DocumentPermissionLevel.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied")

    if doc_in.name is not None:
        doc.name = doc_in.name
    if doc_in.description is not None:
        doc.description = doc_in.description
    if doc_in.project_id is not None:
        doc.project_id = doc_in.project_id
    if doc_in.is_starred is not None:
        doc.is_starred = doc_in.is_starred

    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = perm
    return resp

@router.delete("/{id}")
def soft_delete_document(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only document owner can delete this document")

    doc.is_deleted = True
    doc.deleted_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="document.moved_to_trash",
        resource_type="document",
        resource_id=doc.id
    )

    return {"message": "Document moved to trash"}

@router.post("/{id}/restore")
def restore_document(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only document owner can restore this document")

    doc.is_deleted = False
    doc.deleted_at = None
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="document.restored",
        resource_type="document",
        resource_id=doc.id
    )

    return {"message": "Document restored"}

@router.delete("/{id}/permanent")
def permanent_delete_document(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can permanently delete")

    # Clean up storage files
    storage_provider.delete_file(doc.storage_key)
    for v in doc.versions:
        storage_provider.delete_file(v.storage_key)

    db.delete(doc)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="document.permanently_deleted",
        resource_type="document",
        resource_id=id
    )

    return {"message": "Document permanently deleted"}

# --- Document Versions ---

@router.post("/{id}/versions/complete", response_model=DocumentResponse)
def complete_new_version(
    id: str,
    v_in: DocumentVersionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if perm not in [DocumentPermissionLevel.OWNER.value, DocumentPermissionLevel.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied to add version")

    new_version_num = doc.current_version + 1
    doc.current_version = new_version_num
    doc.storage_key = v_in.storage_key
    doc.file_size = v_in.file_size
    doc.checksum = v_in.checksum
    db.commit()

    version_record = DocumentVersion(
        document_id=doc.id,
        version_number=new_version_num,
        storage_key=v_in.storage_key,
        file_size=v_in.file_size,
        checksum=v_in.checksum,
        change_description=v_in.change_description,
        uploader_id=current_user.id
    )
    db.add(version_record)
    db.commit()
    db.refresh(doc)

    log_activity_event(
        db=db,
        project_id=doc.project_id,
        actor_id=current_user.id,
        action="version.created",
        entity_type="document",
        entity_id=doc.id,
        description=f"{current_user.name} uploaded version v{new_version_num} of '{doc.name}'"
    )

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = perm
    return resp

@router.post("/{id}/versions/{version_id}/restore", response_model=DocumentResponse)
def restore_version(
    id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if perm not in [DocumentPermissionLevel.OWNER.value, DocumentPermissionLevel.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied to restore version")

    target_v = db.query(DocumentVersion).filter(
        DocumentVersion.id == version_id,
        DocumentVersion.document_id == doc.id
    ).first()
    if not target_v:
        raise HTTPException(status_code=404, detail="Version not found")

    # Create a new version that restores target_v
    new_version_num = doc.current_version + 1
    doc.current_version = new_version_num
    doc.storage_key = target_v.storage_key
    doc.file_size = target_v.file_size
    doc.checksum = target_v.checksum
    db.commit()

    restored_v = DocumentVersion(
        document_id=doc.id,
        version_number=new_version_num,
        storage_key=target_v.storage_key,
        file_size=target_v.file_size,
        checksum=target_v.checksum,
        change_description=f"Restored from version v{target_v.version_number}",
        uploader_id=current_user.id
    )
    db.add(restored_v)
    db.commit()
    db.refresh(doc)

    resp = DocumentResponse.model_validate(doc)
    resp.download_url = storage_provider.generate_download_url(doc.storage_key, filename=doc.name)
    resp.preview_url = storage_provider.generate_download_url(doc.storage_key)
    resp.user_permission = perm
    return resp

@router.get("/{id}/diff", response_model=DocumentDiffResponse)
def compare_document_versions(
    id: str,
    v1: int = Query(..., description="Base version number (e.g. 1)"),
    v2: int = Query(..., description="Target version number to compare with (e.g. 2)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if not perm:
        raise HTTPException(status_code=403, detail="Access denied to document")

    ver1 = db.query(DocumentVersion).filter(DocumentVersion.document_id == id, DocumentVersion.version_number == v1).first()
    ver2 = db.query(DocumentVersion).filter(DocumentVersion.document_id == id, DocumentVersion.version_number == v2).first()

    if not ver1 or not ver2:
        raise HTTPException(status_code=404, detail="One or both versions not found for comparison")

    bytes1 = storage_provider.get_file_bytes(ver1.storage_key) or b""
    bytes2 = storage_provider.get_file_bytes(ver2.storage_key) or b""

    try:
        text1 = bytes1.decode("utf-8")
        text2 = bytes2.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Visual diff is only available for text/markdown documents")

    lines1 = text1.splitlines()
    lines2 = text2.splitlines()

    matcher = difflib.SequenceMatcher(None, lines1, lines2)
    diff_lines: List[DiffLine] = []
    additions = 0
    deletions = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            for idx in range(i1, i2):
                diff_lines.append(DiffLine(
                    type="equal",
                    content=lines1[idx],
                    old_lineno=idx + 1,
                    new_lineno=j1 + (idx - i1) + 1
                ))
        elif tag == "delete":
            for idx in range(i1, i2):
                deletions += 1
                diff_lines.append(DiffLine(
                    type="delete",
                    content=lines1[idx],
                    old_lineno=idx + 1,
                    new_lineno=None
                ))
        elif tag == "insert":
            for idx in range(j1, j2):
                additions += 1
                diff_lines.append(DiffLine(
                    type="insert",
                    content=lines2[idx],
                    old_lineno=None,
                    new_lineno=idx + 1
                ))
        elif tag == "replace":
            for idx in range(i1, i2):
                deletions += 1
                diff_lines.append(DiffLine(
                    type="delete",
                    content=lines1[idx],
                    old_lineno=idx + 1,
                    new_lineno=None
                ))
            for idx in range(j1, j2):
                additions += 1
                diff_lines.append(DiffLine(
                    type="insert",
                    content=lines2[idx],
                    old_lineno=None,
                    new_lineno=idx + 1
                ))

    raw_diff_str = "\n".join(difflib.unified_diff(
        lines1, lines2,
        fromfile=f"v{v1}",
        tofile=f"v{v2}",
        lineterm=""
    ))

    return DocumentDiffResponse(
        document_id=id,
        v1_number=v1,
        v2_number=v2,
        v1_created_at=ver1.created_at,
        v2_created_at=ver2.created_at,
        additions=additions,
        deletions=deletions,
        diff_lines=diff_lines,
        raw_diff=raw_diff_str
    )

# --- Document Sharing & Links ---

@router.post("/{id}/share", response_model=DocumentPermissionResponse)
def share_document(
    id: str,
    share_in: DocumentPermissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can manage document permissions")

    target_user = db.query(User).filter(User.email == share_in.user_email.lower()).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found with this email")

    perm = db.query(DocumentPermission).filter(
        DocumentPermission.document_id == doc.id,
        DocumentPermission.user_id == target_user.id
    ).first()
    if perm:
        perm.permission_level = share_in.permission_level
    else:
        perm = DocumentPermission(
            document_id=doc.id,
            user_id=target_user.id,
            permission_level=share_in.permission_level
        )
        db.add(perm)

    db.commit()
    db.refresh(perm)

    create_user_notification(
        db=db,
        recipient_id=target_user.id,
        title="Document Shared",
        message=f"{current_user.name} shared document '{doc.name}' with you ({share_in.permission_level})",
        link=f"/documents/{doc.id}"
    )

    return perm

@router.post("/{id}/share-link", response_model=ShareLinkResponse)
def create_share_link(
    id: str,
    link_in: ShareLinkCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Document).filter(Document.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    perm = get_document_permission(doc, current_user.id, db)
    if perm not in [DocumentPermissionLevel.OWNER.value, DocumentPermissionLevel.EDITOR.value]:
        raise HTTPException(status_code=403, detail="Permission denied to create share links")

    token = secrets.token_urlsafe(24)
    expires_at = None
    if link_in.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=link_in.expires_in_hours)

    password_hash = get_password_hash(link_in.password) if link_in.password else None
    max_downloads = 1 if link_in.burn_after_reading else link_in.max_downloads

    share_link = ShareLink(
        document_id=doc.id,
        token=token,
        permission_level=link_in.permission_level,
        expires_at=expires_at,
        password_hash=password_hash,
        max_downloads=max_downloads,
        created_by_id=current_user.id
    )
    db.add(share_link)
    db.commit()
    db.refresh(share_link)

    resp = ShareLinkResponse.model_validate(share_link)
    resp.has_password = bool(share_link.password_hash)
    resp.burn_after_reading = (share_link.max_downloads == 1)
    resp.share_url = f"/shared/{token}"
    return resp

@router.get("/shared/{token}")
def get_shared_document_metadata(
    token: str,
    db: Session = Depends(get_db)
):
    """Returns metadata and whether password verification is required before unlocking."""
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invalid or expired share link")

    if link.expires_at:
        exp_dt = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
        if exp_dt < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Share link has expired")

    if link.max_downloads and link.download_count >= link.max_downloads:
        raise HTTPException(status_code=410, detail="This single-use share link has already been viewed/burned.")

    doc = link.document
    if doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document is no longer available")

    return {
        "id": doc.id,
        "name": doc.name,
        "mime_type": doc.mime_type,
        "file_size": doc.file_size,
        "has_password": bool(link.password_hash),
        "burn_after_reading": (link.max_downloads == 1),
        "expires_at": link.expires_at.isoformat() if link.expires_at else None
    }

@router.post("/shared/{token}/unlock")
def unlock_shared_document(
    token: str,
    verify_in: ShareLinkVerifyRequest,
    db: Session = Depends(get_db)
):
    """Verifies password if required, burns link if single-use, and unlocks download/preview URLs."""
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Invalid or expired share link")

    if link.expires_at:
        exp_dt = link.expires_at if link.expires_at.tzinfo else link.expires_at.replace(tzinfo=timezone.utc)
        if exp_dt < datetime.now(timezone.utc):
            raise HTTPException(status_code=410, detail="Share link has expired")

    if link.max_downloads and link.download_count >= link.max_downloads:
        raise HTTPException(status_code=410, detail="This single-use share link has already been viewed/burned.")

    # Check password if configured
    if link.password_hash:
        if not verify_in.password or not verify_password(verify_in.password, link.password_hash):
            raise HTTPException(status_code=401, detail="Incorrect password for this protected share link")

    doc = link.document
    if doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document is no longer available")

    # Increment view count
    link.download_count += 1
    db.commit()

    return {
        "id": doc.id,
        "name": doc.name,
        "mime_type": doc.mime_type,
        "file_size": doc.file_size,
        "permission_level": link.permission_level,
        "burned": bool(link.max_downloads and link.download_count >= link.max_downloads),
        "download_url": storage_provider.generate_download_url(doc.storage_key, filename=doc.name),
        "preview_url": storage_provider.generate_download_url(doc.storage_key)
    }
