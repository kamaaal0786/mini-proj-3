"""
Upload router — POST /api/academic/upload (CSV or XLSX).
Pipeline: validate schema → row validation → persist → trigger inference → write risk history.
"""
import io
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.base import get_db
from app.db.models import (
    User, StudentProfile, AcademicRecord, CreditRecord, RiskHistory, RiskLevel
)
from app.auth.dependencies import get_current_user, require_role
from app.credits.engine import compute_credits
from app.risk.inference import ModelService
from app.interventions.engine import evaluate_rules
from app.db.models import Intervention, InterventionStatus, UserRole

router = APIRouter(prefix='/api/academic', tags=['uploads'])

REQUIRED_COLS = {
    'roll_no', 'attendance', 'marks', 'gpa',
    'assignment_completion', 'failed_subjects',
    'earned_credits', 'expected_credits', 'required_credits'
}


def _parse_file(file: UploadFile) -> Any:
    """Return a pandas DataFrame from CSV or XLSX."""
    import pandas as pd
    content = file.file.read()
    if file.filename and file.filename.endswith('.xlsx'):
        return pd.read_excel(io.BytesIO(content))
    else:
        try:
            return pd.read_csv(io.BytesIO(content))
        except Exception:
            return pd.read_csv(io.BytesIO(content), sep=';')


def _validate_row(row: dict) -> list[str]:
    """Return list of errors for a single row, or empty list if valid."""
    errors = []
    for col in REQUIRED_COLS:
        if col == 'roll_no':
            continue
        try:
            val = float(row.get(col, ''))
            if val < 0:
                errors.append(f'{col} must be >= 0')
        except (TypeError, ValueError):
            errors.append(f'{col} is missing or not numeric')

    if 'attendance' in row:
        try:
            if not (0 <= float(row['attendance']) <= 100):
                errors.append('attendance must be 0-100')
        except (TypeError, ValueError):
            pass
    return errors


@router.post('/upload')
def upload_academic(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role('admin', 'faculty')),
):
    """
    Accept CSV or XLSX, validate structure and rows, persist valid rows,
    run inference for each affected student, return import summary.
    """
    if not file.filename:
        raise HTTPException(400, 'No file uploaded')
    if not (file.filename.endswith('.csv') or file.filename.endswith('.xlsx')):
        raise HTTPException(400, 'Only .csv and .xlsx files are accepted')

    try:
        df = _parse_file(file)
    except Exception as exc:
        raise HTTPException(400, f'Could not parse file: {exc}')

    # Validate columns
    missing_cols = REQUIRED_COLS - set(df.columns)
    if missing_cols:
        raise HTTPException(
            400,
            f'File is missing required columns: {sorted(missing_cols)}. '
            f'Required: {sorted(REQUIRED_COLS)}'
        )

    rows_imported = 0
    rows_failed   = 0
    row_errors    = []
    svc           = ModelService.get()
    now           = datetime.now(timezone.utc)
    term          = now.strftime('%Y-S%m')   # e.g. 2024-S08

    for idx, row in df.iterrows():
        row_dict = row.to_dict()
        row_num  = idx + 2   # 1-indexed, header is row 1

        # Find student by roll_no
        roll_no = str(row_dict.get('roll_no', '')).strip()
        if not roll_no:
            row_errors.append({'row': row_num, 'errors': ['roll_no is required']})
            rows_failed += 1
            continue

        profile = db.query(StudentProfile).filter(StudentProfile.roll_no == roll_no).first()
        if not profile:
            row_errors.append({'row': row_num, 'roll_no': roll_no, 'errors': [f'No student with roll_no={roll_no}']})
            rows_failed += 1
            continue

        # Faculty can only update their own students
        if current_user.role == UserRole.faculty:
            from app.db.models import StudentFaculty
            assignment = db.query(StudentFaculty).filter(
                StudentFaculty.student_id == profile.student_id,
                StudentFaculty.faculty_id == current_user.id,
            ).first()
            if not assignment:
                row_errors.append({'row': row_num, 'roll_no': roll_no, 'errors': ['Not your assigned student']})
                rows_failed += 1
                continue

        # Validate row values
        errors = _validate_row(row_dict)
        if errors:
            row_errors.append({'row': row_num, 'roll_no': roll_no, 'errors': errors})
            rows_failed += 1
            continue

        # Persist academic record
        academic = AcademicRecord(
            student_id=profile.student_id,
            term=term,
            attendance=float(row_dict['attendance']),
            marks=float(row_dict['marks']),
            gpa=float(row_dict['gpa']),
            assignment_completion=float(row_dict['assignment_completion']),
            failed_subjects=int(float(row_dict['failed_subjects'])),
            recorded_at=now,
        )
        db.add(academic)
        db.flush()

        # Persist credit record
        earned   = float(row_dict['earned_credits'])
        expected = float(row_dict['expected_credits'])
        required = float(row_dict['required_credits'])
        cs = compute_credits(earned, expected, required)

        credit = CreditRecord(
            student_id=profile.student_id,
            period=term,
            earned_credits=cs['earned'],
            expected_credits=cs['expected'],
            required_credits=cs['required'],
            deficit=cs['deficit'],
        )
        db.add(credit)
        db.flush()

        # Run inference
        features = {
            'attendance':           academic.attendance,
            'marks':                academic.marks,
            'gpa':                  academic.gpa,
            'assignment_completion': academic.assignment_completion,
            'failed_subjects':      academic.failed_subjects,
        }
        result = svc.predict(features)
        level_map = {'LOW': RiskLevel.low, 'MEDIUM': RiskLevel.medium, 'HIGH': RiskLevel.high}

        snapshot = RiskHistory(
            student_id=profile.student_id,
            probability=result['risk_probability'],
            risk_level=level_map[result['risk_level']],
            model_version=result['model_version'],
            calculated_at=now,
        )
        db.add(snapshot)
        db.flush()

        # Auto-generate interventions from rules (skip if already pending/in-progress)
        triggered = evaluate_rules(academic, credit, snapshot)
        for rule in triggered:
            existing = db.query(Intervention).filter(
                Intervention.student_id == profile.student_id,
                Intervention.type == rule['type'],
                Intervention.status.in_([InterventionStatus.pending, InterventionStatus.in_progress]),
            ).first()
            if not existing:
                db.add(Intervention(
                    student_id=profile.student_id,
                    type=rule['type'],
                    reason=rule['reason'],
                    priority=rule['priority'],
                    status=InterventionStatus.pending,
                    assigned_to=profile.mentor_id,
                    created_at=now,
                ))

        rows_imported += 1

    db.commit()

    return {
        'rows_imported': rows_imported,
        'rows_failed':   rows_failed,
        'errors':        row_errors,
        'message':       f'Import complete. {rows_imported} rows imported, {rows_failed} failed.',
    }
