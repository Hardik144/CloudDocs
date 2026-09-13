from datetime import datetime
from typing import Optional, List
from pydantic import ConfigDict, BaseModel, Field
from app.schemas.user import UserResponse

class DocumentUploadRequest(BaseModel):
    filename: str
    mime_type: str
    file_size: int
    project_id: Optional[str] = None
    change_description: Optional[str] = None

class DocumentUploadAuthResponse(BaseModel):
    upload_url: str
    storage_key: str
    method: str = "PUT"
    headers: dict = {}
    is_direct_r2: bool = False

class DocumentCompleteUpload(BaseModel):
    name: str
    storage_key: str
    mime_type: str
    file_size: int
    project_id: Optional[str] = None
    description: Optional[str] = None
    checksum: Optional[str] = None
    change_description: Optional[str] = "Initial version"

class DocumentVersionCreate(BaseModel):
    storage_key: str
    file_size: int
    checksum: Optional[str] = None
    change_description: Optional[str] = None

class DocumentVersionResponse(BaseModel):
    id: str
    document_id: str
    version_number: int
    storage_key: str
    file_size: int
    checksum: Optional[str] = None
    change_description: Optional[str] = None
    created_at: datetime
    uploader: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentPermissionCreate(BaseModel):
    user_email: str
    permission_level: str = "viewer"

class DocumentPermissionResponse(BaseModel):
    id: str
    document_id: str
    user_id: str
    permission_level: str
    created_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class ShareLinkCreate(BaseModel):
    permission_level: str = "viewer"
    expires_in_hours: Optional[int] = 24
    password: Optional[str] = None
    max_downloads: Optional[int] = None

class ShareLinkResponse(BaseModel):
    id: str
    document_id: str
    token: str
    permission_level: str
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = None
    download_count: int
    created_at: datetime
    share_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    project_id: Optional[str] = None
    is_starred: Optional[bool] = None

class DocumentTextContentUpdate(BaseModel):
    content: str
    change_description: Optional[str] = "Edited in browser"

class DocumentResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    owner_id: str
    storage_key: str
    mime_type: str
    file_size: int
    current_version: int
    checksum: Optional[str] = None
    is_starred: bool
    is_deleted: bool
    deleted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserResponse] = None
    download_url: Optional[str] = None
    preview_url: Optional[str] = None
    user_permission: Optional[str] = "owner"
    versions: Optional[List[DocumentVersionResponse]] = None

    model_config = ConfigDict(from_attributes=True)
