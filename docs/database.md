# CloudDocs — Database Schema & Data Models

CloudDocs uses **PostgreSQL 16** for relational metadata storage and application state. All uploaded file payloads reside in object storage (**Cloudflare R2** / local storage), ensuring the database remains fast, lean, and easily backed up.

---

## Entity Relationship Diagram

```text
  +------------------+         +--------------------+
  |      users       |1       *|      projects      |
  +------------------+<--------+--------------------+
  | id (PK, UUID)    |         | id (PK, UUID)      |
  | email (Unique)   |         | owner_id (FK->User)|
  | password_hash    |         | status, priority   |
  +--------+---------+         +---------+----------+
           |                             |
           |                             |1
           |                             |
           |                             |*
           |                   +---------v----------+
           |                   |       tasks        |
           |                   +--------------------+
           |                   | id (PK, UUID)      |
           |                   | project_id (FK)    |
           |                   | status, priority   |
           |                   +--------------------+
           |
           |1
           |
           |*
  +--------v---------+1       *+--------------------+
  |    documents     +-------->| document_versions  |
  +------------------+         +--------------------+
  | id (PK, UUID)    |         | id (PK, UUID)      |
  | project_id (FK)  |         | document_id (FK)   |
  | storage_key      |         | version_number (1..|
  | current_version  |         | storage_key        |
  | is_starred       |         | checksum (SHA-256) |
  | is_deleted       |         +--------------------+
  +------------------+
```

---

## Key Tables

1. `users`: Stores credentials (bcrypt hashed), roles (admin/member), profile information.
2. `projects`: Workspaces with statuses (`planning`, `active`, `on_hold`, `completed`, `archived`) and priorities.
3. `project_members`: Collaborator associations and permissions (`owner`, `editor`, `commenter`, `viewer`).
4. `documents`: File metadata, current version pointer, storage key, soft-delete trash status.
5. `document_versions`: Full historical revisions of files with change descriptions and checksums.
6. `tasks`: Kanban work items with statuses (`todo`, `in_progress`, `in_review`, `completed`).
7. `milestones`: Target deadlines with completion percentages.
8. `audit_logs`: Dedicated immutable security and compliance audit trail.
