import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Response, Query
from fastapi.responses import StreamingResponse
import io
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.document import Document
from app.schemas.collaboration import StorageSummary, StorageTypeStat
from app.api.deps import get_current_user, get_optional_user
from app.services.storage import storage_provider, LocalStorageProvider
from app.models.user import User

router = APIRouter()

DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB

@router.get("/summary", response_model=StorageSummary)
def get_storage_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    docs = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted == False
    ).all()

    total_used = sum(d.file_size for d in docs)
    files_count = len(docs)
    pct_used = round((total_used / DEFAULT_QUOTA_BYTES) * 100, 2)

    # Classify by type
    categories = {
        "PDF": {"bytes": 0, "count": 0},
        "Documents": {"bytes": 0, "count": 0}, # docx, txt, md, csv, xlsx, pptx
        "Images": {"bytes": 0, "count": 0}, # png, jpg, webp
        "Archives": {"bytes": 0, "count": 0}, # zip, tar
        "Other": {"bytes": 0, "count": 0}
    }

    for d in docs:
        mime = d.mime_type.lower()
        ext = d.name.rsplit(".", 1)[-1].lower() if "." in d.name else ""

        if "pdf" in mime or ext == "pdf":
            cat = "PDF"
        elif any(k in mime for k in ["text", "word", "spreadsheet", "presentation", "officedocument"]) or ext in ["docx", "txt", "md", "csv", "xlsx", "pptx"]:
            cat = "Documents"
        elif "image" in mime or ext in ["png", "jpg", "jpeg", "webp", "gif"]:
            cat = "Images"
        elif "zip" in mime or ext in ["zip", "tar", "gz"]:
            cat = "Archives"
        else:
            cat = "Other"

        categories[cat]["bytes"] += d.file_size
        categories[cat]["count"] += 1

    breakdown: List[StorageTypeStat] = []
    for cat_name, val in categories.items():
        ratio = round((val["bytes"] / total_used * 100), 1) if total_used > 0 else 0.0
        breakdown.append(StorageTypeStat(
            type_name=cat_name,
            bytes=val["bytes"],
            count=val["count"],
            percentage=ratio
        ))

    # Recent uploads
    recent_docs = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.is_deleted == False
    ).order_by(Document.created_at.desc()).limit(5).all()

    recent_uploads = [
        {
            "id": r.id,
            "name": r.name,
            "size": r.file_size,
            "created_at": r.created_at.isoformat(),
            "mime_type": r.mime_type
        }
        for r in recent_docs
    ]

    return StorageSummary(
        used_bytes=total_used,
        quota_bytes=DEFAULT_QUOTA_BYTES,
        percentage_used=pct_used,
        files_count=files_count,
        types_breakdown=breakdown,
        recent_uploads=recent_uploads
    )

# --- Local storage fallback upload & download endpoints ---

@router.post("/upload/{storage_key:path}")
async def local_upload(
    storage_key: str,
    file: UploadFile = File(...)
):
    content = await file.read()
    success = storage_provider.save_file(storage_key, content, file.content_type or "application/octet-stream")
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save local file")
    return {"message": "File uploaded successfully", "storage_key": storage_key, "size": len(content)}

import mimetypes

@router.get("/download/{storage_key:path}")
def local_download(
    storage_key: str,
    filename: Optional[str] = None
):
    content = storage_provider.get_file_bytes(storage_key)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")

    guessed_type, _ = mimetypes.guess_type(filename or storage_key)
    media_type = guessed_type or "application/octet-stream"

    headers = {}
    if filename:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'

    return Response(content=content, media_type=media_type, headers=headers)
