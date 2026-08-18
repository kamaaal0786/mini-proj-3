"""
Tests for risk inference and history endpoints.
SDK §15: Saved model returns reproducible outputs; new snapshots appended.

Uses the shared conftest.py (session-scoped SQLite).
Emails are unique per invocation using a counter to avoid UNIQUE collisions
on the session-scoped DB.
"""
import pytest
import itertools

_counter = itertools.count(1)


@pytest.fixture()
def faculty_token_and_student(client, db):
    from passlib.context import CryptContext
    from app.db.models import User, StudentProfile, AcademicRecord, UserRole, UserStatus

    n = next(_counter)
    pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

    fac = User(email=f'risk_fac_{n}@test.com', name=f'Risk Fac {n}',
               password_hash=pwd.hash('pw'), role=UserRole.faculty, status=UserStatus.active)
    db.add(fac); db.flush()

    stu = User(email=f'risk_stu_{n}@test.com', name=f'Risk Stu {n}',
               password_hash=pwd.hash('pw'), role=UserRole.student, status=UserStatus.active)
    db.add(stu); db.flush()

    profile = StudentProfile(user_id=stu.id, roll_no=f'RISK{n:04d}', program='CS', semester=1)
    db.add(profile); db.flush()

    academic = AcademicRecord(
        student_id=profile.student_id, term='2024-S1',
        attendance=80.0, marks=70.0, gpa=7.0,
        assignment_completion=75.0, failed_subjects=0,
        source='test'
    )
    db.add(academic)
    db.commit()

    resp = client.post('/api/auth/login',
                       data={'username': f'risk_fac_{n}@test.com', 'password': 'pw'})
    assert resp.status_code == 200, f"Faculty login failed: {resp.text}"
    token = resp.json()['access_token']
    return token, profile.student_id


def test_predict_returns_risk_fields(client, faculty_token_and_student):
    token, sid = faculty_token_and_student
    resp = client.post(f'/api/risk/{sid}/predict',
                       headers={'Authorization': f'Bearer {token}'})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert 'risk_probability' in body
    assert body['risk_level'] in ('LOW', 'MEDIUM', 'HIGH')
    assert 'model_version' in body


def test_history_grows_on_repeated_predict(client, faculty_token_and_student):
    token, sid = faculty_token_and_student
    headers = {'Authorization': f'Bearer {token}'}
    client.post(f'/api/risk/{sid}/predict', headers=headers)
    client.post(f'/api/risk/{sid}/predict', headers=headers)

    hist = client.get(f'/api/risk/{sid}/history', headers=headers).json()
    assert len(hist) >= 2, 'History must accumulate without overwriting'


def test_history_week_numbers_are_sequential(client, faculty_token_and_student):
    token, sid = faculty_token_and_student
    headers = {'Authorization': f'Bearer {token}'}
    for _ in range(3):
        client.post(f'/api/risk/{sid}/predict', headers=headers)

    hist = client.get(f'/api/risk/{sid}/history', headers=headers).json()
    weeks = [h['week'] for h in hist]
    assert weeks == list(range(1, len(weeks) + 1)), f'Expected sequential, got {weeks}'


def test_current_returns_latest_snapshot(client, faculty_token_and_student):
    token, sid = faculty_token_and_student
    headers = {'Authorization': f'Bearer {token}'}
    client.post(f'/api/risk/{sid}/predict', headers=headers)
    resp = client.get(f'/api/risk/{sid}/current', headers=headers)
    assert resp.status_code == 200
    assert 'risk_probability' in resp.json()
