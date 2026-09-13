from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.user import User, UserRole, UserStatus
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.api.deps import get_current_user
from app.services.audit_service import log_audit_event

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    new_user = User(
        email=user_in.email.lower(),
        name=user_in.name,
        password_hash=get_password_hash(user_in.password),
        role=UserRole.MEMBER.value,
        status=UserStatus.ACTIVE.value,
        is_demo_user=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(
        db=db,
        actor_id=new_user.id,
        action="user.registered",
        resource_type="user",
        resource_id=new_user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent")
    )

    access_token = create_access_token(new_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        log_audit_event(
            db=db,
            actor_id=None,
            action="auth.login_failed",
            resource_type="auth",
            resource_id=login_in.email.lower(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent")
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(status_code=403, detail="Account is suspended")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db=db,
        actor_id=user.id,
        action="auth.login_success",
        resource_type="user",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("User-Agent")
    )

    access_token = create_access_token(user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/demo-login", response_model=Token)
def demo_login(request: Request, db: Session = Depends(get_db)):
    """Instant login for recruiters / evaluation in isolated demo mode."""
    demo_email = "demo@clouddocs.io"
    user = db.query(User).filter(User.email == demo_email).first()
    if not user:
        user = User(
            email=demo_email,
            name="Demo Recruiter",
            password_hash=get_password_hash("DemoPass123!"),
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            is_demo_user=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
