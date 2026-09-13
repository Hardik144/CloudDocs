from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserResponse, UserProfileUpdate, UserPasswordChange
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if profile_in.name is not None:
        current_user.name = profile_in.name
    if profile_in.avatar_url is not None:
        current_user.avatar_url = profile_in.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def change_password(
    pwd_in: UserPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(pwd_in.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")

    current_user.password_hash = get_password_hash(pwd_in.new_password)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=current_user.id,
        action="user.password_changed",
        resource_type="user",
        resource_id=current_user.id
    )

    return {"message": "Password updated successfully"}

@router.get("/", response_model=List[UserResponse])
def search_users(
    query: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(User).filter(User.id != current_user.id)
    if query:
        search_pattern = f"%{query}%"
        q = q.filter((User.name.ilike(search_pattern)) | (User.email.ilike(search_pattern)))
    return q.limit(limit).all()
