"""
Intervention rule engine.
All thresholds come from config.py — never scattered in React or random files.
"""
from typing import Optional
from app.db.models import AcademicRecord, CreditRecord, RiskHistory, RiskLevel
from app.config import get_settings


# Intervention type constants (match DB enum)
ATTENDANCE_PLAN    = 'ATTENDANCE_PLAN'
BACKLOG_PLAN       = 'BACKLOG_PLAN'
CREDIT_RECOVERY    = 'CREDIT_RECOVERY_PLAN'
ASSIGNMENT_SUPPORT = 'ASSIGNMENT_SUPPORT'
MENTOR_REVIEW      = 'MENTOR_REVIEW'


def evaluate_rules(
    academic: Optional[AcademicRecord],
    credit: Optional[CreditRecord],
    risk: Optional[RiskHistory],
) -> list[dict]:
    """
    Evaluate intervention rules against the latest academic/credit/risk data.
    Returns a list of triggered interventions:
    [{ type, reason, priority }]

    Priority: HIGH if risk==HIGH, MEDIUM otherwise.
    """
    s = get_settings()
    triggered = []

    risk_high = risk and risk.risk_level == RiskLevel.high

    if academic:
        if float(academic.attendance) < s.attendance_threshold:
            triggered.append({
                'type': ATTENDANCE_PLAN,
                'reason': f'Attendance {academic.attendance:.1f}% is below {s.attendance_threshold}%',
                'priority': 'HIGH' if risk_high else 'MEDIUM',
            })

        if int(academic.failed_subjects) >= s.failed_subjects_threshold:
            triggered.append({
                'type': BACKLOG_PLAN,
                'reason': f'{academic.failed_subjects} failed subjects (threshold: {s.failed_subjects_threshold})',
                'priority': 'HIGH' if risk_high else 'MEDIUM',
            })

        if float(academic.assignment_completion) < s.assignment_completion_threshold:
            triggered.append({
                'type': ASSIGNMENT_SUPPORT,
                'reason': f'Assignment completion {academic.assignment_completion:.1f}% < {s.assignment_completion_threshold}%',
                'priority': 'MEDIUM',
            })

    if credit:
        from app.credits.engine import compute_credits
        cs = compute_credits(credit.earned_credits, credit.expected_credits, credit.required_credits)
        if cs['deficit'] > s.credit_deficit_threshold:
            triggered.append({
                'type': CREDIT_RECOVERY,
                'reason': f'Credit deficit {cs["deficit"]:.1f} exceeds threshold {s.credit_deficit_threshold}',
                'priority': 'HIGH' if risk_high else 'MEDIUM',
            })

    if risk_high:
        triggered.append({
            'type': MENTOR_REVIEW,
            'reason': f'Overall dropout risk is HIGH ({risk.probability:.0%})',
            'priority': 'HIGH',
        })

    return triggered
