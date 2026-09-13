# CloudDocs

### DevOps-Driven Document & Project Management Platform

CloudDocs is a modern full-stack, cloud-native web application that allows teams to securely manage documents, organize projects, collaborate in real time, and track activity without installing any software.

The DevOps, cloud, storage, security, CI/CD, and monitoring complexity operate completely behind the scenes.

---

## 🌟 Key Features

- **Intuitive SaaS User Experience**: Normal users simply register, upload files, organize into workspaces, view/edit, collaborate, and manage tasks.
- **Direct Cloud Storage (Cloudflare R2)**: High-performance S3-compatible file storage with cryptographically signed presigned URLs. Large files upload directly from the browser to Cloudflare R2 without burdening the application server.
- **Local Storage Provider Fallback**: Seamless local filesystem fallback allowing instant, zero-cost local development and offline automated testing without requiring cloud credentials.
- **True Document Version Control**: Internal revision tracking (v1, v2, v3, v4). View revision histories, compare changes, download previous revisions, and restore older versions.
- **In-Browser Text & Markdown Editing**: Edit text and markdown files directly in the browser; saving automatically commits a new version to history.
- **Project ↔ Document ↔ Task Relationship**: Documents belong to projects. Workspaces contain documents, Kanban task boards, milestones, and collaborator directories.
- **Calculated Project Health Score**: Transparent mathematical health algorithm:
  $$\text{Health} = 0.35 \times \text{Tasks} + 0.25 \times \text{Milestones} + 0.20 \times \text{Deadlines} + 0.20 \times \text{Activity}$$
- **Role-Based Collaboration & Real-Time Presence**: Owner, Editor, Commenter, and Viewer permissions enforced by backend RBAC. Live collaborator presence indicators powered by WebSockets.
- **Instant Recruiter Demo Mode**: 1-click evaluation access via **"Try Demo"** loaded with pre-seeded projects, documents, version histories, and metrics.
- **DevSecOps & Observability**: Prometheus metrics endpoint (`/metrics`), Grafana dashboards, structured JSON logging with request correlation IDs (`req_xxxxxx`), and Trivy container vulnerability scanning.

---

## 🏗️ Architecture Overview

```text
                                  BROWSER CLIENT
                               (Next.js 14 / React)
                                        │
                         ┌──────────────┴──────────────┐
                         │ HTTP / REST                 │ Direct Upload
                         ▼                             ▼
                 [ NGINX REVERSE PROXY ]       [ CLOUDFLARE R2 ]
                         │                       (Object Storage)
                         │ Proxy Pass                  ▲
                         ▼                             │ Presigned URLs
               [ FASTAPI MODULAR MONOLITH ] ───────────┘
                ├── Request Correlation (req_xxxxxx)
                ├── Prometheus Metrics (/metrics)
                └── WebSockets (/ws/projects)
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
    [ POSTGRESQL 16 ]             [ REDIS ]
    (Metadata / Relations)     (Cache / Presence)
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.12+
- Node.js 20+
- (Optional) Docker & Docker Compose

### 1. Clone & Configure Environment
```bash
cp .env.example .env
```

### 2. Run Backend
```bash
# Set up virtualenv
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

# Run migrations and seed demo data
PYTHONPATH=backend python -m app.scripts.seed_demo_data

# Start FastAPI server
PYTHONPATH=backend uvicorn app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://localhost:8000` (OpenAPI Docs: `http://localhost:8000/docs`)

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend Web App will be accessible at: `http://localhost:3000`

---

## 🐳 Docker Compose Deployment

Start the complete application stack (Frontend, Backend, PostgreSQL, Redis, Nginx):
```bash
docker compose up -d --build
```
Access CloudDocs at: `http://localhost`

### Optional Monitoring Stack (Prometheus, Grafana, Loki)
```bash
docker compose -f docker-compose.monitoring.yml up -d
```
- **Prometheus**: `http://localhost:9090`
- **Grafana**: `http://localhost:3001` (Credentials: `admin` / `admin`)
- **Loki**: `http://localhost:3100`

---

## ☸️ Kubernetes Deployment (`k8s/`)

Deploy to any local Kubernetes cluster (Minikube / k3d) or managed cloud provider:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/postgres-local.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

---

## 🧪 Automated Testing

### Backend Unit & Integration Tests (Pytest)
```bash
PYTHONPATH=backend pytest -v backend/tests
```
Includes:
- Health and readiness probe tests
- Prometheus metrics endpoint test
- Authentication & JWT issuance tests
- 1-click recruiter demo login tests
- Project & task lifecycle tests
- Cloud storage presigned URL & document versioning tests
- Full End-to-End User Journey test (`test_e2e_flow.py`)

### Frontend Production Build Test
```bash
cd frontend && npm run build
```

---

## 🛡️ DevSecOps & Security

- **Trivy Container Scanning**: Automated security scanning across repository files and Docker images in GitHub Actions.
- **RBAC Authorization**: Fine-grained server-side permission checks on all document and project operations.
- **Presigned Temporary URLs**: Private Cloudflare R2 bucket credentials never leave the backend.
- **Security Audit Logs**: Dedicated audit logs track logins, document downloads, sharing, and role modifications.

---

## 📚 Documentation Directory

- [`docs/architecture.md`](docs/architecture.md): Deep-dive system architecture and data flow diagrams.
- [`docs/api.md`](docs/api.md): Complete REST and WebSocket API specifications.
- [`docs/database.md`](docs/database.md): PostgreSQL schema and entity-relationship models.
- [`docs/deployment.md`](docs/deployment.md): Multi-environment deployment guide (Docker, Kubernetes, Free-Tier Cloud).
- [`docs/devops.md`](docs/devops.md): CI/CD workflows, Docker, and Prometheus/Grafana setup.
- [`docs/security.md`](docs/security.md): DevSecOps, threat modeling, and access control specs.

---

## 📄 License
MIT License. Built for production-ready, cloud-native document and project management.
