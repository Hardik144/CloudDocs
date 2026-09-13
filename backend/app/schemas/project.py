from datetime import datetime
from typing import Optional, List
from pydantic import ConfigDict, BaseModel, Field
from app.schemas.user import UserResponse

class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "active"
    priority: str = "medium"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class ProjectMemberCreate(BaseModel):
    user_email: str
    role: str = "viewer"

class ProjectMemberUpdate(BaseModel):
    role: str

class ProjectMemberResponse(BaseModel):
    id: str
    project_id: str
    user_id: str
    role: str
    joined_at: datetime
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

class MilestoneBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "open"
    progress_pct: int = Field(0, ge=0, le=100)

class MilestoneCreate(MilestoneBase):
    pass

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    status: Optional[str] = None
    progress_pct: Optional[int] = Field(None, ge=0, le=100)

class MilestoneResponse(MilestoneBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ProjectHealthScore(BaseModel):
    score: int
    status: str # Excellent, Good, At Risk, Critical
    breakdown: dict
    summary: str

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserResponse] = None
    members_count: Optional[int] = 0
    documents_count: Optional[int] = 0
    tasks_count: Optional[int] = 0
    health: Optional[ProjectHealthScore] = None

    model_config = ConfigDict(from_attributes=True)
