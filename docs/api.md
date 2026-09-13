# CloudDocs — API Reference Specification

The CloudDocs API is versioned under `/api/v1` and auto-documents OpenAPI schemas at `/docs`.

---

## Authentication (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- **Request**: `{ "name": "...", "email": "...", "password": "..." }`
- **Response**: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

### `POST /api/v1/auth/login`
- **Request**: `{ "email": "...", "password": "..." }`
- **Response**: JWT bearer token.

### `POST /api/v1/auth/demo-login`
- **Description**: 1-click recruiter evaluation login creating isolated demo session with pre-seeded projects and documents.

### `GET /api/v1/auth/me`
- **Description**: Current authenticated user profile.

---

## Documents (`/api/v1/documents`)

### `POST /api/v1/documents/request-upload`
- **Request**: `{ "filename": "...", "mime_type": "...", "file_size": 1024, "project_id": null }`
- **Response**: `{ "upload_url": "...", "storage_key": "...", "method": "PUT", "is_direct_r2": true }`

### `POST /api/v1/documents/complete-upload`
- **Request**: `{ "name": "...", "storage_key": "...", "mime_type": "...", "file_size": 1024, "project_id": null }`
- **Response**: Document metadata and version 1 record.

### `GET /api/v1/documents/`
- **Query Params**: `project_id`, `starred`, `trash`, `query`
- **Response**: List of documents with pre-signed download and preview URLs.

### `GET /api/v1/documents/{id}/content` & `PUT /api/v1/documents/{id}/content`
- **Description**: In-browser text editing for Markdown/TXT files. Saving auto-creates version `v(n+1)`.

### `POST /api/v1/documents/{id}/share-link`
- **Request**: `{ "permission_level": "viewer", "expires_in_hours": 24 }`
- **Response**: Expiring share URL token.

---

## Projects & Tasks (`/api/v1/projects`, `/api/v1/tasks`)

### `GET /api/v1/projects/{id}/health`
- **Response**: Calculated project health score (0-100%) and breakdown:
  ```json
  {
    "score": 88,
    "status": "Excellent",
    "breakdown": {
      "task_completion": 100.0,
      "milestone_progress": 85.0,
      "deadline_adherence": 100.0,
      "recent_activity": 100.0
    }
  }
  ```

---

## Observability & Health

- `GET /health`: Liveness probe.
- `GET /health/ready`: Readiness probe checking database connectivity.
- `GET /metrics`: Prometheus metric scraping endpoint.
