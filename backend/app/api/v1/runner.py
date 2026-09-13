from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from app.models.user import User
from app.api.deps import get_current_user
from app.services.code_runner import execute_python_code

router = APIRouter()

class CodeExecutionRequest(BaseModel):
    language: str = Field("python", description="Language to execute: 'python' or 'javascript'")
    code: str = Field(..., max_length=50000, description="Source code to execute")

class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    duration_ms: float
    timed_out: bool

@router.post("/execute", response_model=CodeExecutionResponse)
def execute_code(
    payload: CodeExecutionRequest,
    current_user: User = Depends(get_current_user)
):
    lang = payload.language.lower()
    if lang == "python":
        result = execute_python_code(payload.code)
        return result
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Language '{payload.language}' is not supported yet for server-side sandbox execution. Python is supported."
        )
