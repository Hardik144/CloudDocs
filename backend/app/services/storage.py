import os
import abc
import boto3
from botocore.config import Config
from typing import Optional, Dict, Any
from app.core.config import settings
import logging

logger = logging.getLogger("clouddocs.storage")

class BaseStorageProvider(abc.ABC):
    @abc.abstractmethod
    def generate_upload_url(self, storage_key: str, mime_type: str, expires_in: int = 3600) -> Dict[str, Any]:
        pass

    @abc.abstractmethod
    def generate_download_url(self, storage_key: str, expires_in: int = 3600, filename: Optional[str] = None) -> str:
        pass

    @abc.abstractmethod
    def save_file(self, storage_key: str, content: bytes, mime_type: str = "application/octet-stream") -> bool:
        pass

    @abc.abstractmethod
    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        pass

    @abc.abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        pass


class R2StorageProvider(BaseStorageProvider):
    def __init__(self):
        self.bucket_name = settings.R2_BUCKET_NAME
        endpoint = settings.R2_ENDPOINT
        if not endpoint and settings.R2_ACCOUNT_ID:
            endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            config=Config(signature_version="s3v4"),
            region_name="auto"
        )
        logger.info(f"Initialized Cloudflare R2 Storage Provider for bucket: {self.bucket_name}")

    def generate_upload_url(self, storage_key: str, mime_type: str, expires_in: int = 3600) -> Dict[str, Any]:
        params = {
            "Bucket": self.bucket_name,
            "Key": storage_key,
            "ContentType": mime_type
        }
        url = self.s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params=params,
            ExpiresIn=expires_in
        )
        return {
            "upload_url": url,
            "method": "PUT",
            "headers": {"Content-Type": mime_type},
            "is_direct_r2": True
        }

    def generate_download_url(self, storage_key: str, expires_in: int = 3600, filename: Optional[str] = None) -> str:
        params = {
            "Bucket": self.bucket_name,
            "Key": storage_key
        }
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
        return self.s3_client.generate_presigned_url(
            ClientMethod="get_object",
            Params=params,
            ExpiresIn=expires_in
        )

    def save_file(self, storage_key: str, content: bytes, mime_type: str = "application/octet-stream") -> bool:
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=storage_key,
                Body=content,
                ContentType=mime_type
            )
            return True
        except Exception as e:
            logger.error(f"Failed to save file to R2: {e}")
            return False

    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=storage_key)
            return response["Body"].read()
        except Exception as e:
            logger.error(f"Failed to get file from R2: {e}")
            return None

    def delete_file(self, storage_key: str) -> bool:
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=storage_key)
            return True
        except Exception as e:
            logger.error(f"Failed to delete file from R2: {e}")
            return False


class LocalStorageProvider(BaseStorageProvider):
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = os.path.abspath(base_dir or settings.LOCAL_STORAGE_DIR)
        os.makedirs(self.base_dir, exist_ok=True)
        logger.info(f"Initialized Local Storage Provider at {self.base_dir}")

    def _get_path(self, storage_key: str) -> str:
        # Prevent directory traversal attacks
        safe_key = os.path.normpath(storage_key).lstrip("/\\")
        full_path = os.path.abspath(os.path.join(self.base_dir, safe_key))
        if not full_path.startswith(self.base_dir):
            raise ValueError("Path traversal detected")
        return full_path

    def generate_upload_url(self, storage_key: str, mime_type: str, expires_in: int = 3600) -> Dict[str, Any]:
        # For local dev fallback, upload is processed via local API endpoint /api/v1/storage/upload/{storage_key}
        return {
            "upload_url": f"/api/v1/storage/upload/{storage_key}",
            "method": "POST",
            "headers": {},
            "is_direct_r2": False
        }

    def generate_download_url(self, storage_key: str, expires_in: int = 3600, filename: Optional[str] = None) -> str:
        url = f"/api/v1/storage/download/{storage_key}"
        if filename:
            url += f"?filename={filename}"
        return url

    def save_file(self, storage_key: str, content: bytes, mime_type: str = "application/octet-stream") -> bool:
        full_path = self._get_path(storage_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(content)
        return True

    def get_file_bytes(self, storage_key: str) -> Optional[bytes]:
        full_path = self._get_path(storage_key)
        if not os.path.exists(full_path):
            return None
        with open(full_path, "rb") as f:
            return f.read()

    def delete_file(self, storage_key: str) -> bool:
        full_path = self._get_path(storage_key)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
                return True
            except Exception:
                return False
        return True


def get_storage_provider() -> BaseStorageProvider:
    if settings.STORAGE_PROVIDER.lower() == "r2" and settings.R2_ACCESS_KEY_ID and settings.R2_SECRET_ACCESS_KEY:
        try:
            return R2StorageProvider()
        except Exception as e:
            logger.warning(f"R2 initialization failed ({e}). Falling back to LocalStorageProvider.")
            return LocalStorageProvider()
    return LocalStorageProvider()

storage_provider = get_storage_provider()
