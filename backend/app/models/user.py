import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Boolean, Enum
import enum
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(512), nullable=True)
    role = Column(String(50), default=UserRole.MEMBER.value, nullable=False)
    status = Column(String(50), default=UserStatus.ACTIVE.value, nullable=False)
    is_demo_user = Column(Boolean, default=False, nullable=False)
    last_login_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)
