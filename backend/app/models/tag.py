import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Tag(Base):
    __tablename__ = "tags"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    color = Column(String(20), default="#6366f1", nullable=False)

    documents = relationship("DocumentTag", back_populates="tag", cascade="all, delete-orphan")

class DocumentTag(Base):
    __tablename__ = "document_tags"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    tag_id = Column(String(36), ForeignKey("tags.id", ondelete="CASCADE"), nullable=False, index=True)

    document = relationship("Document", back_populates="tags")
    tag = relationship("Tag", back_populates="documents")
