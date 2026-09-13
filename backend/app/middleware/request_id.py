import time
import uuid
import logging
import json
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("clouddocs.access")

class RequestCorrelationMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate or accept request ID
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = f"req_{uuid.uuid4().hex[:8]}"

        request.state.request_id = request_id
        start_time = time.time()

        try:
            response: Response = await call_next(request)
            duration_ms = round((time.time() - start_time) * 1000, 2)
            response.headers["X-Request-ID"] = request_id

            # Avoid logging sensitive paths in full or noisy metrics scraping
            if not request.url.path.startswith("/metrics"):
                log_data = {
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                    "ip": request.client.host if request.client else "unknown"
                }
                logger.info(json.dumps(log_data))

            return response
        except Exception as exc:
            duration_ms = round((time.time() - start_time) * 1000, 2)
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status": 500,
                "duration_ms": duration_ms,
                "error": str(exc)
            }
            logger.error(json.dumps(log_data))
            raise exc
