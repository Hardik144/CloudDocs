import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, BigInteger, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class ProjectArchive(Base):
    __tablename__ = "project_archives"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    uploaded_by_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    name = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False)
    archive_type = Column(String(32), nullable=False, default="zip")
    file_size = Column(BigInteger, nullable=False, default=0)
    total_files = Column(Integer, nullable=False, default=0)
    total_dirs = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True)
    
    # Nested file tree structure stored as JSON
    file_tree = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    project = relationship("Project", back_populates="archives")
    uploader = relationship("User", foreign_keys=[uploaded_by_id])
