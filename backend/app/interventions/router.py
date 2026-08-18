"""
Interventions router — GET list, POST create, PATCH update.

Fixes in Phase 3:
- Faculty filter: use StudentFaculty join instead of assigned_to == user_id
  so all assigned students' interventions are visible, not just ones the faculty created
- Add student_name to serialized response (join User via StudentProfile)
- Status normalization: accept UPPER or lower from frontend
- Audit trail correctly written on every PATCH
"""
from datetime import datetime, timezone, date
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, StudentFaculty, Intervention, InterventionUpdate,
    UserRole, InterventionStatus
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix='/api/interventions', tags=['interventions'])


# ── Schemas ──────────────────────────────────────────────────────────────────

class CreateInterventionRequest(BaseModel):
    student_id: int
    type: str
    reason: str
    priority: str = 'MEDIUM'
    due_date: Optional[date] = None
    assigned_to: Optional[int] = None   # user_id of faculty/mentor


class UpdateInterventionRequest(BaseModel):
    status: Optional[str] = None
    note: Optional[str] = None
    outcome: Optional[str] = None
    due_date: Optional[date] = None


# ── Helpers ──────────────────────────────────────────────────────────────────

def _student_name(student_id: int, db: Session) -> str:
    """Resolve student_id → display name via StudentProfile → User join."""
    profile = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user))
        .filter(StudentProfile.student_id == student_id)
        .first()
    )
    return profile.user.name if profile and profile.user else f'Student #{student_id}'


def _normalize_status(raw: str) -> InterventionStatus:
    """Accept both 'PENDING' and 'pending' from the frontend."""
    try:
        return InterventionStatus[raw.lower()]
    except KeyError:
        raise HTTPException(400, f'Invalid status: {raw}. '
                            f'Valid: {[s.name.upper() for s in InterventionStatus]}')


def _serialize(iv: Intervention, student_name: str = '') -> dict:
    return {
        'id':           iv.id,
        'student_id':   iv.student_id,
        'student_name': student_name,
        'type':         iv.type,
        'reason':       iv.reason,
        'priority':     iv.priority,
        'status':       iv.status.value.upper() if iv.status else None,
        'due_date':     iv.due_date.isoformat() if iv.due_date else None,
        'assigned_to':  iv.assigned_to,
        'created_at':   iv.created_at.isoformat() if iv.created_at else None,
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get('')
def list_interventions(
    student_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Role-aware intervention list:
    - Student  → only their own
    - Faculty  → all students assigned to them (via StudentFaculty), optionally filtered
    - Mentor   → all students whose mentor_id == current_user.id
    - Admin    → everything, optionally filtered by student_id
    """
    q = db.query(Intervention)

    if current_user.role == UserRole.student:
        profile = db.query(StudentProfile).filter(
            StudentProfile.user_id == current_user.id
        ).first()
        if not profile:
            return []
        q = q.filter(Intervention.student_id == profile.student_id)

    elif current_user.role == UserRole.faculty:
        # Get all student_ids assigned to this faculty via StudentFaculty
        assigned_sids = [
            r.student_id for r in
            db.query(StudentFaculty.student_id)
            .filter(StudentFaculty.faculty_id == current_user.id)
            .distinct()
            .all()
        ]
        if not assigned_sids:
            return []
        q = q.filter(Intervention.student_id.in_(assigned_sids))
        if student_id:
            q = q.filter(Intervention.student_id == student_id)

    elif current_user.role == UserRole.mentor:
        # Get all students whose mentor_id == current_user.id
        mentored_sids = [
            r.student_id for r in
            db.query(StudentProfile.student_id)
            .filter(StudentProfile.mentor_id == current_user.id)
            .all()
        ]
        if not mentored_sids:
            return []
        q = q.filter(Intervention.student_id.in_(mentored_sids))
        if student_id:
            q = q.filter(Intervention.student_id == student_id)

    elif student_id:
        # Admin with optional filter
        q = q.filter(Intervention.student_id == student_id)

    interventions = q.order_by(desc(Intervention.created_at)).all()

    # Batch-resolve student names
    sids = list({iv.student_id for iv in interventions})
    profiles = (
        db.query(StudentProfile)
        .options(joinedload(StudentProfile.user))
        .filter(StudentProfile.student_id.in_(sids))
        .all()
    )
    name_map = {p.student_id: (p.user.name if p.user else '') for p in profiles}

    return [_serialize(iv, name_map.get(iv.student_id, '')) for iv in interventions]


@router.post('', status_code=201)
def create_intervention(
    body: CreateInterventionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new intervention (admin/faculty/mentor only)."""
    if current_user.role == UserRole.student:
        raise HTTPException(403, 'Students cannot create interventions')

    profile = db.query(StudentProfile).filter(
        StudentProfile.student_id == body.student_id
    ).first()
    if not profile:
        raise HTTPException(404, 'Student not found')

    iv = Intervention(
        student_id=body.student_id,
        type=body.type,
        reason=body.reason,
        priority=body.priority,
        status=InterventionStatus.pending,
        due_date=body.due_date,
        assigned_to=body.assigned_to or current_user.id,
        created_at=datetime.now(timezone.utc),
    )
    db.add(iv)
    db.commit()
    db.refresh(iv)
    name = _student_name(body.student_id, db)
    return _serialize(iv, name)


@router.patch('/{intervention_id}')
def update_intervention(
    intervention_id: int,
    body: UpdateInterventionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update status / notes / due_date. Appends an audit update row."""
    if current_user.role == UserRole.student:
        raise HTTPException(403, 'Students cannot update interventions')

    iv = db.query(Intervention).filter(Intervention.id == intervention_id).first()
    if not iv:
        raise HTTPException(404, 'Intervention not found')

    if body.status:
        iv.status = _normalize_status(body.status)
    if body.due_date:
        iv.due_date = body.due_date

    # Append immutable audit trail
    audit = InterventionUpdate(
        intervention_id=intervention_id,
        actor_id=current_user.id,
        status=iv.status.value,
        note=body.note,
        outcome=body.outcome,
        updated_at=datetime.now(timezone.utc),
    )
    db.add(audit)
    db.commit()
    db.refresh(iv)
    name = _student_name(iv.student_id, db)
    return _serialize(iv, name)
