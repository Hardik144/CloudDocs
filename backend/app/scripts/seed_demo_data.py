import uuid
from datetime import datetime, timezone, timedelta
from app.core.database import SessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.user import User, UserRole, UserStatus
from app.models.project import Project, ProjectMember, Milestone, MemberRole, ProjectStatus, ProjectPriority
from app.models.document import Document, DocumentVersion, DocumentPermission, DocumentPermissionLevel
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.collaboration import Comment, Activity, Notification, AuditLog
from app.services.storage import storage_provider

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Check if already seeded
        existing_demo = db.query(User).filter(User.email == "demo@clouddocs.io").first()
        if existing_demo:
            print("Demo data already present. Skipping.")
            return

        print("Seeding rich recruiter-ready demo data...")

        # 1. Users
        demo_user = User(
            id=str(uuid.uuid4()),
            email="demo@clouddocs.io",
            name="Hardik (Cloud Architect)",
            password_hash=get_password_hash("DemoPass123!"),
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
            role=UserRole.ADMIN.value,
            status=UserStatus.ACTIVE.value,
            is_demo_user=True
        )
        rahul = User(
            id=str(uuid.uuid4()),
            email="rahul.verma@clouddocs.io",
            name="Rahul Verma",
            password_hash=get_password_hash("RahulPass123!"),
            avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
            role=UserRole.MEMBER.value,
            status=UserStatus.ACTIVE.value,
            is_demo_user=True
        )
        priya = User(
            id=str(uuid.uuid4()),
            email="priya.sharma@clouddocs.io",
            name="Priya Sharma",
            password_hash=get_password_hash("PriyaPass123!"),
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            role=UserRole.MEMBER.value,
            status=UserStatus.ACTIVE.value,
            is_demo_user=True
        )
        aman = User(
            id=str(uuid.uuid4()),
            email="aman.gupta@clouddocs.io",
            name="Aman Gupta",
            password_hash=get_password_hash("AmanPass123!"),
            avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
            role=UserRole.MEMBER.value,
            status=UserStatus.ACTIVE.value,
            is_demo_user=True
        )
        db.add_all([demo_user, rahul, priya, aman])
        db.commit()

        now = datetime.now(timezone.utc)

        # 2. Projects
        proj_cloud = Project(
            id=str(uuid.uuid4()),
            name="CloudDocs SaaS Infrastructure",
            description="Production rollout of CloudDocs on Kubernetes with Cloudflare R2 and Prometheus observability.",
            owner_id=demo_user.id,
            status=ProjectStatus.ACTIVE.value,
            priority=ProjectPriority.CRITICAL.value,
            start_date=now - timedelta(days=14),
            end_date=now + timedelta(days=21)
        )
        proj_mobile = Project(
            id=str(uuid.uuid4()),
            name="Mobile Document Viewer App",
            description="Lightweight iOS and Android offline document cache and preview client.",
            owner_id=demo_user.id,
            status=ProjectStatus.PLANNING.value,
            priority=ProjectPriority.MEDIUM.value,
            start_date=now - timedelta(days=3),
            end_date=now + timedelta(days=45)
        )
        db.add_all([proj_cloud, proj_mobile])
        db.commit()

        # Project Members
        db.add_all([
            ProjectMember(project_id=proj_cloud.id, user_id=demo_user.id, role=MemberRole.OWNER.value),
            ProjectMember(project_id=proj_cloud.id, user_id=rahul.id, role=MemberRole.EDITOR.value),
            ProjectMember(project_id=proj_cloud.id, user_id=priya.id, role=MemberRole.COMMENTER.value),
            ProjectMember(project_id=proj_cloud.id, user_id=aman.id, role=MemberRole.VIEWER.value),
            ProjectMember(project_id=proj_mobile.id, user_id=demo_user.id, role=MemberRole.OWNER.value),
            ProjectMember(project_id=proj_mobile.id, user_id=rahul.id, role=MemberRole.EDITOR.value),
        ])
        db.commit()

        # Milestones
        m1 = Milestone(
            project_id=proj_cloud.id,
            title="Core Architecture & Auth Migration",
            description="Establish FastAPI modular monolith and Next.js 14 client.",
            due_date=now - timedelta(days=5),
            status="completed",
            progress_pct=100
        )
        m2 = Milestone(
            project_id=proj_cloud.id,
            title="Cloudflare R2 Direct Uploads",
            description="Configure presigned upload URLs and storage abstraction provider.",
            due_date=now + timedelta(days=3),
            status="open",
            progress_pct=85
        )
        m3 = Milestone(
            project_id=proj_cloud.id,
            title="Kubernetes Rolling Deployments & Observability",
            description="Multi-replica deployment with Prometheus metrics scraping.",
            due_date=now + timedelta(days=15),
            status="open",
            progress_pct=60
        )
        db.add_all([m1, m2, m3])
        db.commit()

        # 3. Documents & Versions
        sample_txt_content = """# CloudDocs System Architecture Specification
## Target Architecture
Next.js 14 Frontend -> FastAPI Monolith -> PostgreSQL 16 + Redis + Cloudflare R2.

### Key Milestones
1. Direct signed uploads to Cloudflare R2 with LocalStorage fallback.
2. In-browser document version control (v1, v2, v3, v4).
3. Project Health Score engine calculation:
   Health = 0.35*Tasks + 0.25*Milestones + 0.20*Deadlines + 0.20*Activity.
4. DevSecOps automated pipeline with Trivy container security scanning.
"""
        doc1_key = f"docs/{demo_user.id}/architecture_spec_v2.md"
        storage_provider.save_file(doc1_key, sample_txt_content.encode("utf-8"), "text/markdown")

        doc1 = Document(
            id=str(uuid.uuid4()),
            name="architecture_spec.md",
            description="Core CloudDocs distributed architecture and storage flow specification.",
            project_id=proj_cloud.id,
            owner_id=demo_user.id,
            storage_key=doc1_key,
            mime_type="text/markdown",
            file_size=len(sample_txt_content),
            current_version=2,
            is_starred=True,
            is_deleted=False
        )
        db.add(doc1)
        db.commit()

        # Versions for doc1
        v1 = DocumentVersion(
            document_id=doc1.id,
            version_number=1,
            storage_key=doc1_key,
            file_size=len(sample_txt_content) - 120,
            change_description="Initial draft of architecture specification",
            uploader_id=demo_user.id,
            created_at=now - timedelta(days=5)
        )
        v2 = DocumentVersion(
            document_id=doc1.id,
            version_number=2,
            storage_key=doc1_key,
            file_size=len(sample_txt_content),
            change_description="Added Cloudflare R2 signed upload sequence and health formula",
            uploader_id=demo_user.id,
            created_at=now - timedelta(hours=6)
        )
        db.add_all([v1, v2])

        # Document 2: Security Whitepaper (PDF)
        pdf_bytes = b"%PDF-1.4 ... CloudDocs Security Whitepaper ... EOF"
        doc2_key = f"docs/{demo_user.id}/security_whitepaper_v1.pdf"
        storage_provider.save_file(doc2_key, pdf_bytes, "application/pdf")
        doc2 = Document(
            id=str(uuid.uuid4()),
            name="Security_Audit_Report.pdf",
            description="OWASP Top 10 security verification and RBAC audit trail.",
            project_id=proj_cloud.id,
            owner_id=demo_user.id,
            storage_key=doc2_key,
            mime_type="application/pdf",
            file_size=2048576, # ~2MB
            current_version=1,
            is_starred=True,
            is_deleted=False
        )
        db.add(doc2)
        db.commit()

        v_pdf = DocumentVersion(
            document_id=doc2.id,
            version_number=1,
            storage_key=doc2_key,
            file_size=2048576,
            change_description="Signed-off security report v1.0",
            uploader_id=demo_user.id
        )
        db.add(v_pdf)
        db.commit()

        # 4. Tasks
        t1 = Task(
            project_id=proj_cloud.id,
            title="Configure Cloudflare R2 bucket and CORS rules",
            description="Enable PUT object signed uploads directly from client browser.",
            creator_id=demo_user.id,
            assignee_id=rahul.id,
            status=TaskStatus.COMPLETED.value,
            priority=TaskPriority.HIGH.value,
            due_date=now - timedelta(days=2)
        )
        t2 = Task(
            project_id=proj_cloud.id,
            title="Implement real-time presence indicators via WebSockets",
            description="Broadcast online / idle states for active project team members.",
            creator_id=demo_user.id,
            assignee_id=demo_user.id,
            status=TaskStatus.IN_PROGRESS.value,
            priority=TaskPriority.HIGH.value,
            due_date=now + timedelta(days=2)
        )
        t3 = Task(
            project_id=proj_cloud.id,
            title="Create Kubernetes rolling update manifests with 3 replicas",
            description="Tune readiness probes and resource limits for the backend deployment.",
            creator_id=demo_user.id,
            assignee_id=rahul.id,
            status=TaskStatus.TODO.value,
            priority=TaskPriority.MEDIUM.value,
            due_date=now + timedelta(days=6)
        )
        db.add_all([t1, t2, t3])
        db.commit()

        # 5. Comments
        c1 = Comment(
            document_id=doc1.id,
            author_id=priya.id,
            content="Reviewed the R2 pre-signed upload URL design. Clean separation between metadata and storage payload!"
        )
        c2 = Comment(
            task_id=t2.id,
            author_id=rahul.id,
            content="WebSocket endpoint /ws/projects/{id} is ready for integration."
        )
        db.add_all([c1, c2])
        db.commit()

        # 6. Activities
        act1 = Activity(
            project_id=proj_cloud.id,
            actor_id=demo_user.id,
            action="document.uploaded",
            entity_type="document",
            entity_id=doc1.id,
            description=f"Hardik uploaded document 'architecture_spec.md'"
        )
        act2 = Activity(
            project_id=proj_cloud.id,
            actor_id=rahul.id,
            action="task.completed",
            entity_type="task",
            entity_id=t1.id,
            description=f"Rahul Verma completed task '{t1.title}'"
        )
        act3 = Activity(
            project_id=proj_cloud.id,
            actor_id=demo_user.id,
            action="version.created",
            entity_type="document",
            entity_id=doc1.id,
            description="Hardik updated architecture_spec.md to v2"
        )
        db.add_all([act1, act2, act3])
        db.commit()

        # 7. Notifications
        notif1 = Notification(
            recipient_id=demo_user.id,
            title="Task Completed",
            message="Rahul Verma completed 'Configure Cloudflare R2 bucket and CORS rules'",
            link=f"/projects/{proj_cloud.id}"
        )
        notif2 = Notification(
            recipient_id=demo_user.id,
            title="New Comment",
            message="Priya Sharma commented on 'architecture_spec.md'",
            link=f"/documents/{doc1.id}"
        )
        db.add_all([notif1, notif2])
        db.commit()

        # 8. Audit Logs
        db.add_all([
            AuditLog(
                actor_id=demo_user.id,
                action="auth.login_success",
                resource_type="auth",
                resource_id=demo_user.id,
                ip_address="127.0.0.1",
                user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
            ),
            AuditLog(
                actor_id=demo_user.id,
                action="document.uploaded",
                resource_type="document",
                resource_id=doc1.id,
                ip_address="127.0.0.1"
            )
        ])
        db.commit()

        print("Demo data seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
