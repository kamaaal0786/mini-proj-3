"""
Dashboard router — GET /api/dashboard/summary
Returns role-specific KPI counts in one call to minimise frontend fetches.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, RiskHistory, RiskLevel,
    Intervention, InterventionStatus, StudentFaculty, UserRole
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix='/api/dashboard', tags=['dashboard'])


@router.get('/summary')
def get_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role

    # ── Latest risk level per student (sub-query) ─────────────────────────
    # Get the most recent risk_history row per student
    latest_risk_subq = (
        db.query(
            RiskHistory.student_id,
            func.max(RiskHistory.calculated_at).label('max_ts')
        )
        .group_by(RiskHistory.student_id)
        .subquery()
    )
    latest_risk = (
        db.query(RiskHistory)
        .join(
            latest_risk_subq,
            (RiskHistory.student_id == latest_risk_subq.c.student_id) &
            (RiskHistory.calculated_at == latest_risk_subq.c.max_ts)
        )
    )

    if role == UserRole.admin:
        total_students = db.query(StudentProfile).count()
        high_risk      = latest_risk.filter(RiskHistory.risk_level == RiskLevel.high).count()
        active_ivs     = db.query(Intervention).filter(
            Intervention.status.in_([InterventionStatus.pending, InterventionStatus.in_progress])
        ).count()
        total_users    = db.query(User).count()

        return {
            'role':            'admin',
            'total_students':  total_students,
            'high_risk':       high_risk,
            'active_interventions': active_ivs,
            'total_users':     total_users,
        }

    elif role in (UserRole.faculty, UserRole.mentor):
        # Get this user's assigned student IDs
        if role == UserRole.faculty:
            assigned_ids = [
                r[0] for r in db.query(StudentFaculty.student_id)
                .filter(StudentFaculty.faculty_id == current_user.id)
                .distinct().all()
            ]
        else:  # mentor
            assigned_ids = [
                r[0] for r in db.query(StudentProfile.student_id)
                .filter(StudentProfile.mentor_id == current_user.id)
                .all()
            ]

        total = len(assigned_ids)
        if total == 0:
            return {
                'role': role.value, 'total_assigned': 0,
                'high_risk': 0, 'medium_risk': 0, 'low_risk': 0,
                'open_interventions': 0,
            }

        high   = latest_risk.filter(RiskHistory.student_id.in_(assigned_ids), RiskHistory.risk_level == RiskLevel.high).count()
        medium = latest_risk.filter(RiskHistory.student_id.in_(assigned_ids), RiskHistory.risk_level == RiskLevel.medium).count()
        low    = latest_risk.filter(RiskHistory.student_id.in_(assigned_ids), RiskHistory.risk_level == RiskLevel.low).count()
        open_ivs = db.query(Intervention).filter(
            Intervention.assigned_to == current_user.id,
            Intervention.status.in_([InterventionStatus.pending, InterventionStatus.in_progress]),
        ).count()

        return {
            'role':            role.value,
            'total_assigned':  total,
            'high_risk':       high,
            'medium_risk':     medium,
            'low_risk':        low,
            'open_interventions': open_ivs,
        }

    else:  # student
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()

        if not profile:
            return {'role': 'student', 'error': 'No student profile'}

        from sqlalchemy import desc
        from app.db.models import CreditRecord
        from app.credits.engine import compute_credits

        latest = (
            db.query(RiskHistory)
            .filter(RiskHistory.student_id == profile.student_id)
            .order_by(desc(RiskHistory.calculated_at))
            .first()
        )
        credit = (
            db.query(CreditRecord)
            .filter(CreditRecord.student_id == profile.student_id)
            .order_by(desc(CreditRecord.period))
            .first()
        )
        open_actions = db.query(Intervention).filter(
            Intervention.student_id == profile.student_id,
            Intervention.status.in_([InterventionStatus.pending, InterventionStatus.in_progress]),
        ).count()

        cs = compute_credits(
            credit.earned_credits, credit.expected_credits, credit.required_credits
        ) if credit else None

        return {
            'role':             'student',
            'risk_level':       latest.risk_level.value if latest else None,
            'risk_probability': float(latest.probability) if latest else None,
            'credit_completion_pct': cs['completion_pct'] if cs else None,
            'credit_status':    cs['status'] if cs else None,
            'open_actions':     open_actions,
        }
