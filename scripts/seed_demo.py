#!/usr/bin/env python3
"""
Seed script — Phase 1 demo data.
Creates: 1 admin, 3 mentors, 5 faculty, 30 synthetic students, 6 courses.
All synthetic records flagged is_demo=True.
Idempotent: safe to run multiple times (checks before insert).

Usage:
  cd backend
  python -m scripts.seed_demo          # from repo root with PYTHONPATH=backend
  # OR
  cd mini proj && python scripts/seed_demo.py

Requires DATABASE_URL in backend/.env or environment.
"""

import sys
import os

# Allow running from the repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

from passlib.context import CryptContext
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import (
    User, StudentProfile, Course, StudentFaculty,
    AcademicRecord, CreditRecord, RiskHistory, RiskLevel,
    Intervention, InterventionStatus,
    UserRole, UserStatus
)
from app.db.base import Base

# Always point to the same file the backend uses (absolute path, matches config.py)
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
_DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'mini_proj.db'))

DATABASE_URL = os.environ.get('DATABASE_URL') or f'sqlite:///{_DB_FILE}'
# If env says postgres (stale terminal), override to SQLite
if 'postgres' in DATABASE_URL:
    DATABASE_URL = f'sqlite:///{_DB_FILE}'

# SQLite-specific connect_args needed for multi-threaded use
_connect_args = {'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}
engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine)

# Always import ALL models so create_all sees the full current schema
from app.db import models as _models  # noqa: F401 — registers all ORM classes
Base.metadata.create_all(bind=engine)  # create/update tables with current schema

pwd = CryptContext(schemes=['bcrypt'], deprecated='auto')

DEMO_PASSWORD = 'Demo@1234'


def hash_pw(plain: str) -> str:
    return pwd.hash(plain)


def get_or_create_user(db, email: str, name: str, role: UserRole) -> User:
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        email=email,
        name=name,
        password_hash=hash_pw(DEMO_PASSWORD),
        role=role,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()
    print(f'  [+] {role.value:10s}  {email}')
    return user


def get_or_create_course(db, code: str, name: str, credits: int, semester: int, faculty_id=None) -> Course:
    course = db.query(Course).filter(Course.code == code).first()
    if course:
        return course
    course = Course(code=code, name=name, credits=credits, semester=semester, faculty_id=faculty_id)
    db.add(course)
    db.flush()
    print(f'  [+] course  {code} — {name}')
    return course


def get_or_create_student(db, email: str, name: str, roll_no: str, program: str, semester: int, mentor_id: int) -> tuple:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == existing.id).first()
        return existing, profile

    user = User(
        email=email,
        name=name,
        password_hash=hash_pw(DEMO_PASSWORD),
        role=UserRole.student,
        status=UserStatus.active,
    )
    db.add(user)
    db.flush()

    profile = StudentProfile(
        user_id=user.id,
        roll_no=roll_no,
        program=program,
        semester=semester,
        mentor_id=mentor_id,
        is_demo=True,
    )
    db.add(profile)
    db.flush()
    return user, profile


def assign_student_faculty(db, student_id: int, faculty_id: int, course_id: int):
    from app.db.models import StudentFaculty
    existing = db.query(StudentFaculty).filter(
        StudentFaculty.student_id == student_id,
        StudentFaculty.faculty_id == faculty_id,
        StudentFaculty.course_id == course_id,
    ).first()
    if not existing:
        db.add(StudentFaculty(student_id=student_id, faculty_id=faculty_id, course_id=course_id))


def seed():
    # Ensure tables exist
    from app.db import models  # noqa
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print('\n=======================================')
        print('  AcademiQ - Phase 1 Demo Seed Script')
        print('=======================================\n')

        # ── 1. Admin ────────────────────────────────────────────────────
        print('> Creating admin...')
        admin = get_or_create_user(db, 'admin@college.edu', 'Dr. Admin Rajan', UserRole.admin)

        # ── 2. Mentors ──────────────────────────────────────────────────
        print('\n> Creating mentors...')
        mentors = [
            get_or_create_user(db, 'mentor1@college.edu', 'Prof. Arjun Sharma', UserRole.mentor),
            get_or_create_user(db, 'mentor2@college.edu', 'Dr. Priya Nair',     UserRole.mentor),
            get_or_create_user(db, 'mentor3@college.edu', 'Dr. Kavya Menon',    UserRole.mentor),
        ]

        # ── 3. Faculty ──────────────────────────────────────────────────
        print('\n> Creating faculty...')
        faculty_list = [
            get_or_create_user(db, 'faculty1@college.edu', 'Dr. Ramesh Kumar',   UserRole.faculty),
            get_or_create_user(db, 'faculty2@college.edu', 'Prof. Sunita Rao',   UserRole.faculty),
            get_or_create_user(db, 'faculty3@college.edu', 'Dr. Anand Pillai',   UserRole.faculty),
            get_or_create_user(db, 'faculty4@college.edu', 'Prof. Meera Iyer',   UserRole.faculty),
            get_or_create_user(db, 'faculty5@college.edu', 'Dr. Vikram Shetty',  UserRole.faculty),
        ]

        # ── 4. Courses ──────────────────────────────────────────────────
        print('\n> Creating courses...')
        courses = [
            get_or_create_course(db, 'CS101', 'Data Structures',          4, 1, faculty_list[0].id),
            get_or_create_course(db, 'CS201', 'Database Management',      3, 2, faculty_list[1].id),
            get_or_create_course(db, 'CS301', 'Machine Learning',         3, 3, faculty_list[2].id),
            get_or_create_course(db, 'MA101', 'Engineering Mathematics',  4, 1, faculty_list[3].id),
            get_or_create_course(db, 'CS401', 'Software Engineering',     3, 4, faculty_list[4].id),
            get_or_create_course(db, 'CS501', 'Computer Networks',        3, 5, faculty_list[0].id),
        ]

        db.flush()

        # ── 5. Students (30 synthetic) ──────────────────────────────────
        print('\n> Creating 30 synthetic students...')

        STUDENT_DATA = [
            # (name, roll_no, program, semester, mentor_idx)
            ('Arun Krishnan',    'CS2401001', 'B.Tech CS',   3,  0),
            ('Bhavana Pillai',   'CS2401002', 'B.Tech CS',   3,  0),
            ('Chetan Reddy',     'CS2401003', 'B.Tech CS',   3,  0),
            ('Divya Srinivas',   'CS2401004', 'B.Tech CS',   3,  0),
            ('Eshan Mehta',      'CS2401005', 'B.Tech CS',   3,  0),
            ('Farida Hassan',    'CS2401006', 'B.Tech CS',   5,  0),
            ('Ganesh Rao',       'CS2401007', 'B.Tech CS',   5,  0),
            ('Harini Anand',     'CS2401008', 'B.Tech CS',   5,  0),
            ('Ishaan Bose',      'CS2401009', 'B.Tech CS',   5,  0),
            ('Jaya Krishnaswamy','CS2401010', 'B.Tech CS',   5,  0),
            # Mentor 2 students
            ('Karthik Suresh',   'ME2401011', 'B.Tech ME',   2,  1),
            ('Lalitha Menon',    'ME2401012', 'B.Tech ME',   2,  1),
            ('Madhu Babu',       'ME2401013', 'B.Tech ME',   2,  1),
            ('Naveen Thomas',    'ME2401014', 'B.Tech ME',   4,  1),
            ('Oviya Patel',      'ME2401015', 'B.Tech ME',   4,  1),
            ('Pranav Singh',     'ME2401016', 'B.Tech ME',   4,  1),
            ('Queenie Joseph',   'ME2401017', 'B.Tech ME',   6,  1),
            ('Rahul Verma',      'ME2401018', 'B.Tech ME',   6,  1),
            ('Sneha Nambiar',    'ME2401019', 'B.Tech ME',   6,  1),
            ('Tejas Gowda',      'ME2401020', 'B.Tech ME',   6,  1),
            # Mentor 3 students
            ('Uma Shankar',      'EC2401021', 'B.Tech ECE',  1,  2),
            ('Vinay Hegde',      'EC2401022', 'B.Tech ECE',  1,  2),
            ('Wasim Akram',      'EC2401023', 'B.Tech ECE',  3,  2),
            ('Xavier Dias',      'EC2401024', 'B.Tech ECE',  3,  2),
            ('Yamini Chakravarti','EC2401025','B.Tech ECE',  3,  2),
            ('Zara Khan',        'EC2401026', 'B.Tech ECE',  5,  2),
            ('Akash Gupta',      'EC2401027', 'B.Tech ECE',  5,  2),
            ('Bindiya Tiwari',   'EC2401028', 'B.Tech ECE',  5,  2),
            ('Chirag Shah',      'EC2401029', 'B.Tech ECE',  7,  2),
            ('Deepa Mohan',      'EC2401030', 'B.Tech ECE',  7,  2),
        ]

        students = []
        for i, (name, roll, program, sem, mentor_idx) in enumerate(STUDENT_DATA, start=1):
            email = f'student{i:03d}@college.edu'
            mentor = mentors[mentor_idx]
            user, profile = get_or_create_student(
                db, email, name, roll, program, sem, mentor.id
            )
            students.append((user, profile))
            if i % 10 == 0:
                print(f'  ... {i}/30 students created')

        db.flush()

        # ── 6. Faculty-Course-Student assignments ──────────────────────
        print('\n> Assigning students to faculty/courses...')
        # CS students → CS courses (faculty 1, 2, 3)
        for user, profile in students[:20]:
            for fac, course in [(faculty_list[0], courses[0]), (faculty_list[1], courses[1])]:
                assign_student_faculty(db, profile.student_id, fac.id, course.course_id)
        # ME/ECE students → other courses (faculty 3, 4, 5)
        for user, profile in students[20:]:
            for fac, course in [(faculty_list[2], courses[2]), (faculty_list[3], courses[3])]:
                assign_student_faculty(db, profile.student_id, fac.id, course.course_id)

        db.commit()

        # ── 7. Academic Records, Credits, Risk, Interventions ────────────────────
        print('> Seeding academic data, risk scores, and interventions...')

        from datetime import datetime, timezone
        import random
        import sys
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'ml'))

        # 6 student scenarios (repeated across 30 students)
        SCENARIOS = [
            # (label, attendance, marks, gpa, assign_pct, failed, earned, expected, required)
            ('healthy',       92, 82, 7.8, 88, 0, 28, 30, 30),
            ('attendance',    61, 70, 6.2, 72, 1, 22, 30, 30),
            ('backlog',       78, 52, 5.1, 65, 3, 20, 30, 30),
            ('credit_def',    80, 74, 6.8, 76, 1, 14, 30, 30),
            ('assignment',    85, 71, 6.5, 45, 0, 25, 30, 30),
            ('high_risk',     55, 44, 4.2, 40, 4, 12, 30, 30),
        ]

        def heuristic_risk(att, marks, gpa, assign, failed):
            score = 0.15
            if att < 75:   score += 0.28
            if failed >= 2: score += 0.22
            if gpa < 5:    score += 0.18
            if assign < 60: score += 0.12
            if marks < 50: score += 0.10
            return min(round(score, 4), 0.97)

        def risk_level(prob):
            if prob < 0.40: return RiskLevel.low
            if prob < 0.70: return RiskLevel.medium
            return RiskLevel.high

        now = datetime.now(timezone.utc)
        term = '2024-SEM1'

        for i, (user, profile) in enumerate(students):
            sc_label, att, mrk, gpa, asgn, fail, earned, expected, required = SCENARIOS[i % len(SCENARIOS)]
            # Add a little variation so students differ slightly
            rng = random.Random(profile.student_id)
            att   = max(0,   min(100, att   + rng.randint(-5, 5)))
            mrk   = max(0,   min(100, mrk   + rng.randint(-5, 5)))
            gpa   = max(0.0, min(10.0, round(gpa + rng.uniform(-0.3, 0.3), 1)))
            asgn  = max(0,   min(100, asgn  + rng.randint(-5, 5)))
            earned = max(0,  earned + rng.randint(-2, 2))

            # Academic record
            academic = AcademicRecord(
                student_id=profile.student_id,
                term=term, recorded_at=now,
                attendance=att, marks=mrk, gpa=gpa,
                assignment_completion=asgn, failed_subjects=fail,
                source='seed',
            )
            db.add(academic)
            db.flush()

            # Credit record
            deficit = max(expected - earned, 0)
            credit = CreditRecord(
                student_id=profile.student_id, period=term,
                earned_credits=earned, expected_credits=expected,
                required_credits=required, deficit=deficit,
            )
            db.add(credit)
            db.flush()

            # Risk snapshot (heuristic — model may not be trained yet)
            prob = heuristic_risk(att, mrk, gpa, asgn, fail)
            try:
                from app.risk.inference import ModelService
                svc = ModelService.get()
                if not svc.loaded:
                    svc.load()
                if svc.loaded:
                    res = svc.predict({'attendance': att, 'marks': mrk, 'gpa': gpa,
                                       'assignment_completion': asgn, 'failed_subjects': fail})
                    prob = res['risk_probability']
            except Exception:
                pass

            snapshot = RiskHistory(
                student_id=profile.student_id,
                calculated_at=now, probability=prob,
                risk_level=risk_level(prob), model_version='dropout-v1',
            )
            db.add(snapshot)
            db.flush()

            # Auto-interventions based on scenario
            from app.interventions.engine import evaluate_rules
            triggered = evaluate_rules(academic, credit, snapshot)
            for rule in triggered:
                db.add(Intervention(
                    student_id=profile.student_id, type=rule['type'],
                    reason=rule['reason'], priority=rule['priority'],
                    status=InterventionStatus.pending,
                    assigned_to=profile.mentor_id, created_at=now,
                ))

        db.commit()
        print(f'  Academic records, risk scores, and interventions seeded for all 30 students.')

        print('\n+ Seed complete!')
        print('-----------------------------------------')
        print(f'  1  admin     ->  admin@college.edu')
        print(f'  3  mentors   ->  mentor1-3@college.edu')
        print(f'  5  faculty   ->  faculty1-5@college.edu')
        print(f'  30 students  ->  student001-030@college.edu')
        print(f'  6  courses   ->  CS101, CS201, CS301, MA101, CS401, CS501')
        print(f'\n  Password for all accounts: {DEMO_PASSWORD}')
        print('-----------------------------------------\n')

    except Exception as e:
        db.rollback()
        print(f'\n[ERROR] Seed failed: {e}')
        raise
    finally:
        db.close()


if __name__ == '__main__':
    seed()
