# CloudDocs — System Architecture & Design

CloudDocs is designed as a modular monolith pairing a modern **Next.js 14** web application with a high-performance **FastAPI** backend, backed by **PostgreSQL 16**, **Redis**, and **Cloudflare R2** object storage.

---

## 1. High-Level Architecture Diagram

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

## 2. Core Architectural Principles

1. **Simple SaaS User Experience**: Normal users never see cloud infrastructure, Kubernetes, or database configurations. All complex DevSecOps, storage, and monitoring systems operate invisibly behind the scenes.
2. **Direct-to-Cloud Storage**: Files never unnecessarily proxy through the application server in production. The browser requests upload authorization, receives a signed presigned PUT URL, uploads directly to Cloudflare R2, and commits metadata to PostgreSQL.
3. **Pluggable Storage Abstraction**:
   - `R2StorageProvider`: High-throughput S3-compatible integration with Cloudflare R2.
   - `LocalStorageProvider`: Local filesystem fallback allowing zero-cost local development and offline testing without cloud credentials.
4. **Resilient Ephemeral Layer**: Redis handles real-time user presence and caching. If Redis becomes temporarily unavailable, the application gracefully falls back to memory-safe operations without failing API requests.
5. **Production Monolith**: A modular monolith architecture avoiding the operational latency, data consistency bugs, and cost overhead of premature microservices.

---

## 3. Real-Time Collaboration & Presence

WebSockets are utilized for genuine real-time value:
- User presence tracking in active workspaces (Online / Idle / Offline)
- Project activity stream broadcasts
- Instant task state updates across collaborator boards
