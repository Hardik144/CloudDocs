from datetime import datetime
from typing import Optional
from pydantic import ConfigDict, BaseModel, Field
from app.schemas.user import UserResponse

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    status: str = "todo" # todo, in_progress, in_review, completed
    priority: str = "medium" # low, medium, high, critical
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None

class TaskCreate(TaskBase):
    project_id: str

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[str] = None

class TaskResponse(TaskBase):
    id: str
    project_id: str
    creator_id: str
    created_at: datetime
    updated_at: datetime
    creator: Optional[UserResponse] = None
    assignee: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
