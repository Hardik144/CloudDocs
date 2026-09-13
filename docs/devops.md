# CloudDocs — DevOps & Observability Architecture

DevOps is a core foundation of CloudDocs. The platform is designed from the ground up for automated delivery, container security, and high observability.

---

## 1. CI/CD Pipeline Flow

```text
Developer Push / PR
        │
        ▼
[ GitHub Actions (ci.yml) ]
        ├── Linting & Type checking
        ├── Pytest Backend Test Suite
        ├── Next.js Production Build
        └── Trivy Vulnerability Scanner
                 │ (Pass)
                 ▼
[ GitHub Actions (deploy.yml) ]
        ├── Docker Multi-Stage Image Builds
        ├── Trivy Container Image Scan
        ├── Publish to GHCR (ghcr.io/clouddocs)
        └── Kubernetes Deployment Rolling Update
```

---

## 2. Docker Architecture

- `backend/Dockerfile`: Multi-stage Python 3.12 build. Strips compilers from the runtime image and runs as an unprivileged user `appuser` (UID 1000). Includes `HEALTHCHECK` probe against `/health`.
- `frontend/Dockerfile`: Multi-stage Node 20 build utilizing Next.js `standalone` output mode to produce an ultra-compact production runner executed as `nextjs` user.
- `nginx/nginx.conf`: High-performance proxy with Gzip compression, WebSocket connection upgrades, and security headers.

---

## 3. Kubernetes Orchestration (`k8s/`)

- **Backend Deployment**: 3 replicas with rolling updates (`maxSurge: 1`, `maxUnavailable: 0`), readiness probes (`/health/ready`), liveness probes (`/health`), and resource requests/limits.
- **Frontend Deployment**: 2 replicas with readiness and liveness probes.
- **Ingress**: TLS termination with cert-manager annotations and routing for API, WebSockets, and UI.
- **Hybrid Database**: Local k8s demo deploys PostgreSQL StatefulSet with PersistentVolumeClaim; public deployments target managed PostgreSQL to eliminate cluster costs.

---

## 4. Observability Stack

- **Prometheus**: Scrapes `/metrics` every 15 seconds to track HTTP request rates, status codes, p95 latencies, and database execution durations.
- **Grafana**: Pre-configured dashboard visualizing real metrics (HTTP req/sec, p95 latency, error rates, active connections).
- **Loki & Promtail**: Centralized structured JSON application logs with correlated request IDs (`req_xxxxxx`).
