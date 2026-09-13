import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.collaboration import AuditLog, Activity, Notification

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    actor_id: Optional[str] = None,
    resource_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        audit = AuditLog(
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            ip_address=ip_address,
            user_agent=user_agent[:250] if user_agent else None,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        db.add(audit)
        db.commit()
    except Exception as e:
        db.rollback()

def log_activity_event(
    db: Session,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    description: str,
    project_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        activity = Activity(
            project_id=project_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            description=description,
            metadata_json=json.dumps(metadata) if metadata else None
        )
        db.add(activity)
        db.commit()
    except Exception as e:
        db.rollback()

def create_user_notification(
    db: Session,
    recipient_id: str,
    title: str,
    message: str,
    link: Optional[str] = None
):
    try:
        notif = Notification(
            recipient_id=recipient_id,
            title=title,
            message=message,
            link=link
        )
        db.add(notif)
        db.commit()
    except Exception as e:
        db.rollback()
