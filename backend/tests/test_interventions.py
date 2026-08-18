"""
Tests for intervention rule engine and CRUD endpoints.
SDK §15: Synthetic scenarios trigger expected rules; PATCH persists; student access denied.

Uses the shared conftest.py (session-scoped SQLite).
Emails use a counter to be unique per invocation.
"""
import itertools
import pytest
from app.db.models import RiskLevel

_counter = itertools.count(100)


# ── Rule Engine Unit Tests (pure functions, no DB needed) ────────────────────

class FakeAcademic:
    def __init__(self, attendance=80, marks=70, gpa=7.0,
                 assignment_completion=75, failed_subjects=0):
        self.attendance = attendance
        self.marks = marks
        self.gpa = gpa
        self.assignment_completion = assignment_completion
        self.failed_subjects = failed_subjects


class FakeCredit:
    def __init__(self, earned_credits=28, expected_credits=30,
                 required_credits=30, deficit=2):
        self.earned_credits = earned_credits
        self.expected_credits = expected_credits
        self.required_credits = required_credits
        self.deficit = deficit


class FakeRisk:
    def __init__(self, level):
        self.risk_level = RiskLevel[level.lower()]
        self.probability = 0.85 if level == 'HIGH' else 0.5


def test_high_risk_triggers_mentor_review():
    from app.interventions.engine import evaluate_rules
    rules = evaluate_rules(FakeAcademic(), FakeCredit(), FakeRisk('HIGH'))
    types = [r['type'] for r in rules]
    assert 'MENTOR_REVIEW' in types, f'MENTOR_REVIEW not triggered. Got: {types}'


def test_low_attendance_triggers_attendance_plan():
    from app.interventions.engine import evaluate_rules
    rules = evaluate_rules(FakeAcademic(attendance=60), FakeCredit(), FakeRisk('MEDIUM'))
    types = [r['type'] for r in rules]
    assert 'ATTENDANCE_PLAN' in types, f'Got: {types}'


def test_credit_deficit_triggers_recovery_plan():
    from app.interventions.engine import evaluate_rules
    credit = FakeCredit(earned_credits=10, expected_credits=30,
                        required_credits=30, deficit=20)
    rules = evaluate_rules(FakeAcademic(), credit, FakeRisk('MEDIUM'))
    types = [r['type'] for r in rules]
    assert 'CREDIT_RECOVERY_PLAN' in types, f'Got: {types}'


def test_healthy_student_no_rules():
    from app.interventions.engine import evaluate_rules
    acad   = FakeAcademic(attendance=95, marks=88, gpa=8.5,
                          assignment_completion=92, failed_subjects=0)
    credit = FakeCredit(earned_credits=30, expected_credits=30,
                        required_credits=30, deficit=0)
    rules  = evaluate_rules(acad, credit, FakeRisk('LOW'))
    assert rules == [], f'Expected no rules for healthy student, got: {rules}'


# ── API Integration Tests ──────────────────────────────────────────────────────

@pytest.fixture()
def iv_tokens(client, db):
    """Unique faculty + student pair per test call."""
    from passlib.context import CryptContext
    from app.db.models import User, StudentProfile, UserRole, UserStatus

    n = next(_counter)
    pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

    fac = User(email=f'iv_fac_{n}@test.com', name=f'IV Fac {n}',
               password_hash=pwd.hash('pw'), role=UserRole.faculty, status=UserStatus.active)
    db.add(fac); db.flush()

    stu = User(email=f'iv_stu_{n}@test.com', name=f'IV Stu {n}',
               password_hash=pwd.hash('pw'), role=UserRole.student, status=UserStatus.active)
    db.add(stu); db.flush()

    profile = StudentProfile(user_id=stu.id, roll_no=f'IV{n:04d}', program='CS', semester=1)
    db.add(profile)
    db.commit()

    fac_tok = client.post('/api/auth/login',
                          data={'username': f'iv_fac_{n}@test.com', 'password': 'pw'}).json()['access_token']
    stu_tok = client.post('/api/auth/login',
                          data={'username': f'iv_stu_{n}@test.com', 'password': 'pw'}).json()['access_token']
    return fac_tok, stu_tok, profile.student_id


def test_faculty_can_create_intervention(client, iv_tokens):
    fac_tok, _, sid = iv_tokens
    resp = client.post('/api/interventions', json={
        'student_id': sid, 'type': 'MENTOR_REVIEW', 'reason': 'High risk', 'priority': 'HIGH'
    }, headers={'Authorization': f'Bearer {fac_tok}'})
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body['type'] == 'MENTOR_REVIEW'
    assert body['student_id'] == sid


def test_student_cannot_create_intervention(client, iv_tokens):
    _, stu_tok, sid = iv_tokens
    resp = client.post('/api/interventions', json={
        'student_id': sid, 'type': 'MENTOR_REVIEW', 'reason': 'X', 'priority': 'LOW'
    }, headers={'Authorization': f'Bearer {stu_tok}'})
    assert resp.status_code == 403


def test_patch_status_persists(client, iv_tokens):
    fac_tok, _, sid = iv_tokens
    h = {'Authorization': f'Bearer {fac_tok}'}
    create_resp = client.post('/api/interventions', json={
        'student_id': sid, 'type': 'ATTENDANCE_PLAN', 'reason': 'Low att', 'priority': 'MEDIUM'
    }, headers=h)
    assert create_resp.status_code == 201, create_resp.text
    iv_id = create_resp.json()['id']

    patch_resp = client.patch(f'/api/interventions/{iv_id}',
                              json={'status': 'IN_PROGRESS'}, headers=h)
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()['status'] == 'IN_PROGRESS'
