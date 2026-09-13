from datetime import datetime, timezone, timedelta
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.project import Project, Milestone
from app.models.task import Task, TaskStatus
from app.models.collaboration import Activity
from app.schemas.project import ProjectHealthScore

def calculate_project_health(project_id: str, db: Session) -> ProjectHealthScore:
    """
    Calculates Project Health Score using the documented formula:
    Health = (0.35 * TaskCompletion) + (0.25 * MilestoneProgress) + (0.20 * DeadlineAdherence) + (0.20 * RecentActivity)
    """
    now = datetime.now(timezone.utc)

    # 1. Task Completion (35%)
    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    total_tasks = len(tasks)
    if total_tasks > 0:
        completed_tasks = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED.value)
        task_score = (completed_tasks / total_tasks) * 100.0
    else:
        task_score = 100.0  # Clean slate

    # 2. Milestone Progress (25%)
    milestones = db.query(Milestone).filter(Milestone.project_id == project_id).all()
    if milestones:
        milestone_score = sum(m.progress_pct for m in milestones) / len(milestones)
    else:
        milestone_score = 100.0

    # 3. Deadline Adherence (20%)
    # Ratio of tasks not overdue
    if total_tasks > 0:
        overdue_tasks = 0
        tasks_with_due = 0
        for t in tasks:
            if t.due_date:
                tasks_with_due += 1
                # If due date has passed and task is not completed
                due_dt = t.due_date if t.due_date.tzinfo else t.due_date.replace(tzinfo=timezone.utc)
                if due_dt < now and t.status != TaskStatus.COMPLETED.value:
                    overdue_tasks += 1
        if tasks_with_due > 0:
            deadline_score = max(0.0, 100.0 - (overdue_tasks / tasks_with_due * 100.0))
        else:
            deadline_score = 100.0
    else:
        deadline_score = 100.0

    # 4. Recent Activity (20%)
    # Check activity events in the last 7 days
    seven_days_ago = now - timedelta(days=7)
    recent_activities_count = db.query(Activity).filter(
        Activity.project_id == project_id,
        Activity.created_at >= seven_days_ago
    ).count()
    
    # Scale: 0 events = 50%, 1-5 events = 80%, >5 events = 100%
    if recent_activities_count >= 5:
        activity_score = 100.0
    elif recent_activities_count > 0:
        activity_score = 75.0 + (recent_activities_count * 5.0)
    else:
        activity_score = 60.0

    total_health = (
        (0.35 * task_score) +
        (0.25 * milestone_score) +
        (0.20 * deadline_score) +
        (0.20 * activity_score)
    )
    final_score = int(round(min(100.0, max(0.0, total_health))))

    if final_score >= 85:
        status = "Excellent"
    elif final_score >= 70:
        status = "Good"
    elif final_score >= 50:
        status = "At Risk"
    else:
        status = "Critical"

    breakdown = {
        "task_completion": round(task_score, 1),
        "milestone_progress": round(milestone_score, 1),
        "deadline_adherence": round(deadline_score, 1),
        "recent_activity": round(activity_score, 1)
    }

    summary = f"Project is {status} ({final_score}%). Task completion: {breakdown['task_completion']}%, Milestones: {breakdown['milestone_progress']}%."

    return ProjectHealthScore(
        score=final_score,
        status=status,
        breakdown=breakdown,
        summary=summary
    )
