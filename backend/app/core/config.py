from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "CloudDocs"
    API_V1_STR: str = "/api/v1"
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"

    # Security
    JWT_SECRET: str = "dev-secret-key-clouddocs-change-in-production-min32bytes!"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite:///./clouddocs.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage Provider: "local" or "r2"
    STORAGE_PROVIDER: str = "local"
    LOCAL_STORAGE_DIR: str = "./storage_data"

    # Cloudflare R2 Credentials
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "clouddocs-storage"
    R2_ENDPOINT: Optional[str] = None
    R2_PUBLIC_DOMAIN: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:80"

    # Observability
    METRICS_ENABLED: bool = True

    @property
    def cors_origin_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
