import time
from prometheus_client import Counter, Histogram, Gauge
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total count of HTTP requests",
    ["method", "endpoint", "status_code"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)

HTTP_ACTIVE_REQUESTS = Gauge(
    "http_active_requests",
    "Number of active HTTP requests"
)

class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/metrics":
            return await call_next(request)

        HTTP_ACTIVE_REQUESTS.inc()
        start_time = time.time()
        status_code = 500

        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration = time.time() - start_time
            endpoint = request.url.path
            
            # Group parameter URLs to avoid high cardinality
            if endpoint.startswith("/api/v1/projects/"):
                endpoint = "/api/v1/projects/{id}"
            elif endpoint.startswith("/api/v1/documents/"):
                endpoint = "/api/v1/documents/{id}"
            elif endpoint.startswith("/api/v1/tasks/"):
                endpoint = "/api/v1/tasks/{id}"
            elif endpoint.startswith("/api/v1/storage/"):
                endpoint = "/api/v1/storage/{id}"

            HTTP_REQUESTS_TOTAL.labels(method=request.method, endpoint=endpoint, status_code=status_code).inc()
            HTTP_REQUEST_DURATION_SECONDS.labels(method=request.method, endpoint=endpoint).observe(duration)
            HTTP_ACTIVE_REQUESTS.dec()
