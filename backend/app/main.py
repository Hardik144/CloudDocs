import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
from app.core.config import settings
from app.core.database import Base, engine
from app.middleware.request_id import RequestCorrelationMiddleware
from app.middleware.metrics import PrometheusMiddleware
from app.services.websocket_manager import ws_manager
from app.api.v1 import (
    auth, users, projects, documents, tasks, milestones,
    comments, notifications, search, activity, audit, storage, devops, runner
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("clouddocs")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing CloudDocs application...")
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema synchronized.")
    yield
    logger.info("Shutting down CloudDocs application...")

app = FastAPI(
    title="CloudDocs API",
    description="DevOps-Driven Document & Project Management Platform API",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestCorrelationMiddleware)
if settings.METRICS_ENABLED:
    app.add_middleware(PrometheusMiddleware)
    # Mount /metrics ASGI app
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

# 2. Health check and root shortcuts
@app.get("/", tags=["Root"])
def root():
    return {
        "service": "CloudDocs Backend API",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/health",
        "metrics_url": "/metrics",
        "frontend_app_url": "http://localhost:3000"
    }

@app.get("/health", tags=["Health"])
def root_health():
    return {"status": "healthy", "service": "CloudDocs API", "version": "1.0.0"}

@app.get("/health/ready", tags=["Health"])
def root_ready():
    return {"ready": True}

# 3. Include API v1 Routers
api_v1_prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=f"{api_v1_prefix}/auth", tags=["Auth"])
app.include_router(users.router, prefix=f"{api_v1_prefix}/users", tags=["Users"])
app.include_router(projects.router, prefix=f"{api_v1_prefix}/projects", tags=["Projects"])
app.include_router(documents.router, prefix=f"{api_v1_prefix}/documents", tags=["Documents"])
app.include_router(tasks.router, prefix=f"{api_v1_prefix}/tasks", tags=["Tasks"])
app.include_router(milestones.router, prefix=f"{api_v1_prefix}/milestones", tags=["Milestones"])
app.include_router(comments.router, prefix=f"{api_v1_prefix}/comments", tags=["Comments"])
app.include_router(notifications.router, prefix=f"{api_v1_prefix}/notifications", tags=["Notifications"])
app.include_router(search.router, prefix=f"{api_v1_prefix}/search", tags=["Search"])
app.include_router(activity.router, prefix=f"{api_v1_prefix}/activity", tags=["Activity"])
app.include_router(audit.router, prefix=f"{api_v1_prefix}/audit", tags=["Audit"])
app.include_router(storage.router, prefix=f"{api_v1_prefix}/storage", tags=["Storage"])
app.include_router(devops.router, prefix=f"{api_v1_prefix}/devops", tags=["DevOps"])
app.include_router(runner.router, prefix=f"{api_v1_prefix}/runner", tags=["Runner"])

# 4. WebSockets for real-time presence and updates
@app.websocket("/ws/projects/{project_id}")
async def project_websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...)
):
    await ws_manager.connect_project(websocket, project_id, user_id, user_name)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming ping / messages if needed
    except WebSocketDisconnect:
        ws_manager.disconnect_project(websocket, project_id, user_id)
        await ws_manager.broadcast_presence(project_id)
    except Exception:
        ws_manager.disconnect_project(websocket, project_id, user_id)

