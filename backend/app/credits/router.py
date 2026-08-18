"""Credits router — GET /api/credits/{student_id}."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models import StudentProfile, CreditRecord, User, UserRole
from app.auth.dependencies import get_current_user
from app.credits.engine import compute_credits

router = APIRouter(prefix='/api/credits', tags=['credits'])


@router.get('/{student_id}')
def get_credits(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = db.query(StudentProfile).filter(StudentProfile.student_id == student_id).first()
    if not profile:
        raise HTTPException(404, 'Student not found')

    # Students can only see their own credits
    if current_user.role == UserRole.student and profile.user_id != current_user.id:
        raise HTTPException(403, 'Access denied')

    record = (
        db.query(CreditRecord)
        .filter(CreditRecord.student_id == student_id)
        .order_by(desc(CreditRecord.period))
        .first()
    )
    if not record:
        return {
            'student_id': student_id,
            'period': None,
            'earned': 0,
            'expected': 0,
            'required': 0,
            'completion_pct': 0,
            'deficit': 0,
            'status': 'NO_DATA',
        }

    cs = compute_credits(record.earned_credits, record.expected_credits, record.required_credits)
    return {
        'student_id':     student_id,
        'period':         record.period,
        'earned':         cs['earned'],
        'expected':       cs['expected'],
        'required':       cs['required'],
        'completion_pct': cs['completion_pct'],
        'deficit':        cs['deficit'],
        'status':         cs['status'],
    }
