from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.collaboration import Comment
from app.models.document import Document
from app.models.task import Task
from app.schemas.collaboration import CommentCreate, CommentResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[CommentResponse])
def list_comments(
    document_id: Optional[str] = None,
    task_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not document_id and not task_id:
        raise HTTPException(status_code=400, detail="Must provide either document_id or task_id")

    q = db.query(Comment)
    if document_id:
        q = q.filter(Comment.document_id == document_id)
    if task_id:
        q = q.filter(Comment.task_id == task_id)

    return q.order_by(Comment.created_at.asc()).all()

@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not comment_in.document_id and not comment_in.task_id:
        raise HTTPException(status_code=400, detail="Must provide either document_id or task_id")

    comment = Comment(
        document_id=comment_in.document_id,
        task_id=comment_in.task_id,
        parent_id=comment_in.parent_id,
        author_id=current_user.id,
        content=comment_in.content
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment

@router.delete("/{id}")
def delete_comment(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comment = db.query(Comment).filter(Comment.id == id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only author can delete comment")

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}
