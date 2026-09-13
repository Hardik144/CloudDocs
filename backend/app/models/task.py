import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"

class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    creator_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assignee_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    status = Column(String(50), default=TaskStatus.TODO.value, nullable=False, index=True)
    priority = Column(String(50), default=TaskPriority.MEDIUM.value, nullable=False)
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    project = relationship("Project", back_populates="tasks")
    creator = relationship("User", foreign_keys=[creator_id])
    assignee = relationship("User", foreign_keys=[assignee_id])
    comments = relationship("Comment", foreign_keys="Comment.task_id", cascade="all, delete-orphan")
