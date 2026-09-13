from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import ConfigDict, BaseModel, Field
from app.schemas.user import UserResponse

class CommentCreate(BaseModel):
    document_id: Optional[str] = None
    task_id: Optional[str] = None
    parent_id: Optional[str] = None
    content: str = Field(..., min_length=1)

class CommentResponse(BaseModel):
    id: str
    document_id: Optional[str] = None
    task_id: Optional[str] = None
    parent_id: Optional[str] = None
    content: str
    is_edited: bool
    created_at: datetime
    updated_at: datetime
    author: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ActivityResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    description: str
    metadata_json: Optional[str] = None
    created_at: datetime
    actor: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    metadata_json: Optional[str] = None
    timestamp: datetime
    actor: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class StorageTypeStat(BaseModel):
    type_name: str
    bytes: int
    count: int
    percentage: float

class StorageSummary(BaseModel):
    used_bytes: int
    quota_bytes: int
    percentage_used: float
    files_count: int
    types_breakdown: List[StorageTypeStat]
    recent_uploads: List[Dict[str, Any]]
