"""
Academics router — PATCH /api/students/{id}/academic (manual update).
"""
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, AcademicRecord, CreditRecord,
    RiskHistory, RiskLevel, Intervention, InterventionStatus, UserRole
)
from app.auth.dependencies import get_current_user, require_role
from app.credits.engine import compute_credits
from app.risk.inference import ModelService
from app.interventions.engine import evaluate_rules

router = APIRouter(prefix='/api/students', tags=['academics'])


class AcademicUpdateRequest(BaseModel):
    attendance:            float
    marks:                 float
    gpa:                   float
    assignment_completion: float
    failed_subjects:       int
    earned_credits:        float
    expected_credits:      float
    required_credits:      float
    term:                  Optional[str] = None


@router.patch('/{student_id}/academic')
def update_academic(
    student_id: int,
    body: AcademicUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('admin', 'faculty')),
):
    """Manual academic update → persist → recompute credits → run inference → append risk history."""
    profile = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    if not profile:
        raise HTTPException(404, 'Student not found')

    # Faculty can only update their assigned students
    if current_user.role == UserRole.faculty:
        from app.db.models import StudentFaculty
        assignment = db.query(StudentFaculty).filter(
            StudentFaculty.student_id == student_id,
            StudentFaculty.faculty_id == current_user.id,
        ).first()
        if not assignment:
            raise HTTPException(403, 'Not your assigned student')

    now  = datetime.now(timezone.utc)
    term = body.term or now.strftime('%Y-S%m')

    # Persist academic record
    academic = AcademicRecord(
        student_id=student_id,
        term=term,
        attendance=body.attendance,
        marks=body.marks,
        gpa=body.gpa,
        assignment_completion=body.assignment_completion,
        failed_subjects=body.failed_subjects,
        recorded_at=now,
    )
    db.add(academic)
    db.flush()

    # Credit record
    cs = compute_credits(body.earned_credits, body.expected_credits, body.required_credits)
    credit = CreditRecord(
        student_id=student_id,
        period=term,
        earned_credits=cs['earned'],
        expected_credits=cs['expected'],
        required_credits=cs['required'],
        deficit=cs['deficit'],
    )
    db.add(credit)
    db.flush()

    # Inference
    features = {
        'attendance':            body.attendance,
        'marks':                 body.marks,
        'gpa':                   body.gpa,
        'assignment_completion':  body.assignment_completion,
        'failed_subjects':       body.failed_subjects,
    }
    svc    = ModelService.get()
    result = svc.predict(features)
    level_map = {'LOW': RiskLevel.low, 'MEDIUM': RiskLevel.medium, 'HIGH': RiskLevel.high}

    snapshot = RiskHistory(
        student_id=student_id,
        probability=result['risk_probability'],
        risk_level=level_map[result['risk_level']],
        model_version=result['model_version'],
        calculated_at=now,
    )
    db.add(snapshot)
    db.flush()

    # Auto-interventions
    triggered = evaluate_rules(academic, credit, snapshot)
    for rule in triggered:
        existing = db.query(Intervention).filter(
            Intervention.student_id == student_id,
            Intervention.type == rule['type'],
            Intervention.status.in_([InterventionStatus.pending, InterventionStatus.in_progress]),
        ).first()
        if not existing:
            db.add(Intervention(
                student_id=student_id,
                type=rule['type'],
                reason=rule['reason'],
                priority=rule['priority'],
                status=InterventionStatus.pending,
                assigned_to=profile.mentor_id,
                created_at=now,
            ))

    db.commit()

    return {
        'student_id':     student_id,
        'risk_probability': result['risk_probability'],
        'risk_level':     result['risk_level'],
        'credit_status':  cs['status'],
        'completion_pct': cs['completion_pct'],
        'interventions_triggered': len(triggered),
        'updated_at':     now.isoformat(),
    }
