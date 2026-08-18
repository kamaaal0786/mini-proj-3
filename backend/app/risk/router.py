"""
Risk router — POST predict, GET current/history/explanation.
"""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, AcademicRecord, CreditRecord,
    RiskHistory, RiskLevel, UserRole, Intervention, InterventionStatus
)
from app.auth.dependencies import get_current_user
from app.risk.inference import ModelService

router = APIRouter(prefix='/api/risk', tags=['risk'])


def _get_student_profile(student_id: int, db: Session) -> StudentProfile:
    profile = db.query(StudentProfile).filter(
        StudentProfile.student_id == student_id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail='Student not found')
    return profile


def _check_access(profile: StudentProfile, current_user: User):
    """Students can only see their own risk."""
    if current_user.role == UserRole.student:
        if profile.user_id != current_user.id:
            raise HTTPException(status_code=403, detail='Access denied')


def _latest_academic(student_id: int, db: Session) -> Optional[AcademicRecord]:
    return (
        db.query(AcademicRecord)
        .filter(AcademicRecord.student_id == student_id)
        .order_by(desc(AcademicRecord.recorded_at))
        .first()
    )


def _latest_credit(student_id: int, db: Session) -> Optional[CreditRecord]:
    return (
        db.query(CreditRecord)
        .filter(CreditRecord.student_id == student_id)
        .order_by(desc(CreditRecord.period))
        .first()
    )


def _build_feature_dict(academic: Optional[AcademicRecord], credit: Optional[CreditRecord]) -> dict:
    """Map DB records to the feature dict the inference service expects."""
    return {
        'attendance':           float(academic.attendance)            if academic else 50.0,
        'marks':                float(academic.marks)                 if academic else 50.0,
        'gpa':                  float(academic.gpa)                   if academic else 5.0,
        'assignment_completion': float(academic.assignment_completion) if academic else 50.0,
        'failed_subjects':      int(academic.failed_subjects)         if academic else 0,
    }


def _intervention_adjustment(student_id: int, db: Session) -> tuple[float, int]:
    """
    Reduce risk probability for each recently-completed intervention.
    Rationale: a completed intervention means support was delivered —
    that genuinely reduces dropout likelihood.

    Returns (reduction_fraction, completed_count).
    Each completed intervention in the last 60 days → 8% reduction,
    capped at 30% total.
    """
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=60)

    completed = (
        db.query(Intervention)
        .filter(
            Intervention.student_id == student_id,
            Intervention.status == InterventionStatus.completed,
            Intervention.created_at >= cutoff,
        )
        .count()
    )
    reduction = min(completed * 0.08, 0.30)
    return reduction, completed


@router.post('/{student_id}/predict')
def predict_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run inference for a student and append a new RiskHistory row."""
    profile  = _get_student_profile(student_id, db)
    _check_access(profile, current_user)

    academic = _latest_academic(student_id, db)
    credit   = _latest_credit(student_id, db)
    features = _build_feature_dict(academic, credit)

    svc    = ModelService.get()
    result = svc.predict(features)

    # Apply intervention adjustment — completed plans reduce risk
    adj_reduction, completed_count = _intervention_adjustment(student_id, db)
    raw_prob     = result['risk_probability']
    adj_prob     = round(max(raw_prob - (raw_prob * adj_reduction), 0.03), 4)

    # Recompute level from adjusted probability
    if adj_prob < 0.40:
        adj_level = 'LOW'
    elif adj_prob < 0.70:
        adj_level = 'MEDIUM'
    else:
        adj_level = 'HIGH'

    level_map = {'LOW': RiskLevel.low, 'MEDIUM': RiskLevel.medium, 'HIGH': RiskLevel.high}
    snapshot = RiskHistory(
        student_id=student_id,
        probability=adj_prob,
        risk_level=level_map[adj_level],
        model_version=result['model_version'],
        calculated_at=datetime.now(timezone.utc),
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    response = {
        'student_id':         student_id,
        'risk_probability':   adj_prob,
        'risk_level':         adj_level,
        'model_version':      result['model_version'],
        'calculated_at':      snapshot.calculated_at.isoformat(),
    }
    if completed_count > 0:
        response['intervention_note'] = (
            f'{completed_count} completed intervention(s) reduced risk by '
            f'{round(adj_reduction * 100)}% '
            f'(raw: {round(raw_prob * 100)}% → adjusted: {round(adj_prob * 100)}%)'
        )
    return response


@router.get('/{student_id}/current')
def get_current_risk(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the most recent RiskHistory record for a student."""
    profile = _get_student_profile(student_id, db)
    _check_access(profile, current_user)

    latest = (
        db.query(RiskHistory)
        .filter(RiskHistory.student_id == student_id)
        .order_by(desc(RiskHistory.calculated_at))
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail='No risk score yet. Run /predict first.')

    return {
        'student_id':       student_id,
        'risk_probability': float(latest.probability),
        'risk_level':       latest.risk_level.value,
        'model_version':    latest.model_version,
        'calculated_at':    latest.calculated_at.isoformat() if latest.calculated_at else None,
    }


@router.get('/{student_id}/history')
def get_risk_history(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return all risk snapshots ordered oldest→newest (for trend charts)."""
    profile = _get_student_profile(student_id, db)
    _check_access(profile, current_user)

    rows = (
        db.query(RiskHistory)
        .filter(RiskHistory.student_id == student_id)
        .order_by(RiskHistory.calculated_at)
        .all()
    )
    return [
        {
            'week':             i + 1,
            'risk_probability': float(r.probability),
            'risk_level':       r.risk_level.value,
            'calculated_at':    r.calculated_at.isoformat() if r.calculated_at else None,
        }
        for i, r in enumerate(rows)
    ]


@router.get('/{student_id}/explanation')
def get_explanation(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return SHAP-based (or rule-based) top risk factors."""
    profile  = _get_student_profile(student_id, db)
    _check_access(profile, current_user)

    academic = _latest_academic(student_id, db)
    credit   = _latest_credit(student_id, db)
    features = _build_feature_dict(academic, credit)

    svc     = ModelService.get()
    factors = svc.explain(features)

    return {
        'student_id':  student_id,
        'top_factors': factors,
        'method':      'shap' if svc.loaded else 'rule_based',
    }
