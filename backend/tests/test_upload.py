"""
Tests for CSV/XLSX upload pipeline.
SDK §15: Valid file accepted; malformed columns rejected; mixed rows — valid persist, invalid reported.

Uses the shared conftest.py (session-scoped SQLite).
Roll numbers are unique per invocation using a counter.
"""
import io
import csv
import itertools
import pytest

_counter = itertools.count(200)


def _make_csv(rows, headers=None):
    """Build in-memory CSV bytes for multipart upload."""
    if headers is None:
        headers = ['roll_no', 'term', 'attendance', 'marks', 'gpa',
                   'assignment_completion', 'failed_subjects',
                   'earned_credits', 'expected_credits', 'required_credits']
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return buf.getvalue().encode('utf-8')


def _valid_row(roll_no):
    return {
        'roll_no': roll_no, 'term': '2024-S2',
        'attendance': 85, 'marks': 75, 'gpa': 7.5,
        'assignment_completion': 80, 'failed_subjects': 0,
        'earned_credits': 25, 'expected_credits': 30, 'required_credits': 30,
    }


@pytest.fixture()
def upload_students(db):
    """Seed two unique students that can be referenced by roll_no in uploads."""
    from passlib.context import CryptContext
    from app.db.models import User, StudentProfile, UserRole, UserStatus

    n = next(_counter)
    pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')
    roll_nos = [f'UP{n}A', f'UP{n}B']
    for i, rn in enumerate(roll_nos, start=1):
        stu = User(email=f'up_stu_{n}_{i}@test.com', name=f'Upload Stu {n}{i}',
                   password_hash=pwd.hash('pw'), role=UserRole.student, status=UserStatus.active)
        db.add(stu); db.flush()
        db.add(StudentProfile(user_id=stu.id, roll_no=rn, program='CS', semester=1))
    db.commit()
    return roll_nos


def test_valid_csv_accepted(client, admin_token, upload_students):
    roll_nos = upload_students
    rows = [_valid_row(roll_nos[0]), _valid_row(roll_nos[1])]
    resp = client.post(
        '/api/academic/upload',
        headers={'Authorization': f'Bearer {admin_token}'},
        files={'file': ('test.csv', _make_csv(rows), 'text/csv')},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body['rows_imported'] == 2
    assert body['rows_failed'] == 0


def test_malformed_columns_rejected(client, admin_token):
    """CSV with wrong headers should be rejected immediately (400)."""
    bad_csv = _make_csv([{'bad_col': 'X'}], headers=['bad_col'])
    resp = client.post(
        '/api/academic/upload',
        headers={'Authorization': f'Bearer {admin_token}'},
        files={'file': ('bad.csv', bad_csv, 'text/csv')},
    )
    assert resp.status_code == 400, f'Expected 400, got {resp.status_code}: {resp.text}'


def test_mixed_rows_valid_persist_invalid_reported(client, admin_token, upload_students):
    """Valid rows imported; non-existent roll_no rows appear in errors[]."""
    roll_nos = upload_students
    rows = [
        _valid_row(roll_nos[0]),
        _valid_row('NONEXISTENT_ZZZZ'),   # student doesn't exist → should fail
        _valid_row(roll_nos[1]),
    ]
    resp = client.post(
        '/api/academic/upload',
        headers={'Authorization': f'Bearer {admin_token}'},
        files={'file': ('mixed.csv', _make_csv(rows), 'text/csv')},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body['rows_imported'] >= 2, f"Expected ≥2 imported, got: {body}"
    assert body['rows_failed'] >= 1,   f"Expected ≥1 failed, got: {body}"
    assert len(body.get('errors', [])) >= 1
