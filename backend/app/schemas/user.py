from datetime import datetime
from typing import Optional
from pydantic import ConfigDict, BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    avatar_url: Optional[str] = None
    role: str
    status: str
    is_demo_user: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
