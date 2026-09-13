import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, BigInteger
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base

def utcnow():
    return datetime.now(timezone.utc)

class DocumentPermissionLevel(str, enum.Enum):
    OWNER = "owner"
    EDITOR = "editor"
    COMMENTER = "commenter"
    VIEWER = "viewer"

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_key = Column(String(512), nullable=False)
    mime_type = Column(String(128), nullable=False)
    file_size = Column(BigInteger, nullable=False, default=0)
    current_version = Column(Integer, default=1, nullable=False)
    checksum = Column(String(64), nullable=True) # SHA-256
    is_starred = Column(Boolean, default=False, nullable=False, index=True)
    is_deleted = Column(Boolean, default=False, nullable=False, index=True) # Trash bin
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    project = relationship("Project", back_populates="documents")
    owner = relationship("User", foreign_keys=[owner_id])
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan", order_by="DocumentVersion.version_number.desc()")
    permissions = relationship("DocumentPermission", back_populates="document", cascade="all, delete-orphan")
    share_links = relationship("ShareLink", back_populates="document", cascade="all, delete-orphan")
    comments = relationship("Comment", foreign_keys="Comment.document_id", cascade="all, delete-orphan")
    tags = relationship("DocumentTag", back_populates="document", cascade="all, delete-orphan")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    storage_key = Column(String(512), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    checksum = Column(String(64), nullable=True)
    change_description = Column(String(512), nullable=True)
    uploader_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    document = relationship("Document", back_populates="versions")
    uploader = relationship("User")

class DocumentPermission(Base):
    __tablename__ = "document_permissions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    permission_level = Column(String(50), default=DocumentPermissionLevel.VIEWER.value, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    document = relationship("Document", back_populates="permissions")
    user = relationship("User")

class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(64), unique=True, nullable=False, index=True)
    permission_level = Column(String(50), default=DocumentPermissionLevel.VIEWER.value, nullable=False)
    password_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    max_downloads = Column(Integer, nullable=True)
    download_count = Column(Integer, default=0, nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    document = relationship("Document", back_populates="share_links")
    created_by = relationship("User")
