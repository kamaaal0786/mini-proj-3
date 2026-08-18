"""
SQLAlchemy ORM models — all 9 tables from SDK Section 4.

is_demo flag on StudentProfile separates synthetic seed data from real student records
(satisfies PRD Section 12 / SDK constraint on data separation).
"""
import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Enum as SAEnum, Text, Date, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.db.base import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    faculty = "faculty"
    mentor = "mentor"
    student = "student"


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class RiskLevel(str, enum.Enum):
    low = "LOW"
    medium = "MEDIUM"
    high = "HIGH"


class InterventionType(str, enum.Enum):
    ATTENDANCE_PLAN = "ATTENDANCE_PLAN"
    BACKLOG_PLAN = "BACKLOG_PLAN"
    CREDIT_RECOVERY_PLAN = "CREDIT_RECOVERY_PLAN"
    ASSIGNMENT_SUPPORT = "ASSIGNMENT_SUPPORT"
    MENTOR_REVIEW = "MENTOR_REVIEW"


class InterventionStatus(str, enum.Enum):
    pending = "PENDING"
    assigned = "ASSIGNED"
    in_progress = "IN_PROGRESS"
    completed = "COMPLETED"
    follow_up = "FOLLOW_UP"


class InterventionPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    """All authenticated users across all roles."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(UserRole), nullable=False)
    status = Column(SAEnum(UserStatus), default=UserStatus.active, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student_profile = relationship("StudentProfile", back_populates="user",
                                   foreign_keys="StudentProfile.user_id", uselist=False)
    mentored_students = relationship("StudentProfile", back_populates="mentor",
                                     foreign_keys="StudentProfile.mentor_id")
    taught_courses = relationship("Course", back_populates="faculty")
    intervention_updates = relationship("InterventionUpdate", back_populates="actor")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} role={self.role}>"


class StudentProfile(Base):
    """Student identity — extends User with academic profile details."""
    __tablename__ = "student_profiles"

    student_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    roll_no = Column(String(50), unique=True, nullable=False, index=True)
    program = Column(String(100), nullable=False)
    semester = Column(Integer, nullable=False, default=1)
    mentor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_demo = Column(Boolean, default=False, nullable=False,
                     comment="True for synthetic seed data; False for real student records")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="student_profile",
                        foreign_keys=[user_id])
    mentor = relationship("User", back_populates="mentored_students",
                          foreign_keys=[mentor_id])
    academic_records = relationship("AcademicRecord", back_populates="student",
                                    order_by="AcademicRecord.recorded_at")
    credit_records = relationship("CreditRecord", back_populates="student")
    risk_history = relationship("RiskHistory", back_populates="student",
                                order_by="RiskHistory.calculated_at")
    interventions = relationship("Intervention", back_populates="student")
    faculty_assignments = relationship("StudentFaculty", back_populates="student")

    def __repr__(self):
        return f"<StudentProfile roll_no={self.roll_no} program={self.program}>"


class Course(Base):
    """Course configuration — assigned to a faculty member."""
    __tablename__ = "courses"

    course_id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    credits = Column(Integer, nullable=False, default=3)
    semester = Column(Integer, nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    faculty = relationship("User", back_populates="taught_courses")
    student_assignments = relationship("StudentFaculty", back_populates="course")

    def __repr__(self):
        return f"<Course code={self.code} name={self.name}>"


class StudentFaculty(Base):
    """Junction table: which students a faculty member teaches in which course."""
    __tablename__ = "student_faculty"
    __table_args__ = (
        UniqueConstraint("student_id", "faculty_id", "course_id",
                         name="uq_student_faculty_course"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.student_id"), nullable=False)
    faculty_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.course_id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("StudentProfile", back_populates="faculty_assignments")
    course = relationship("Course", back_populates="student_assignments")

    def __repr__(self):
        return f"<StudentFaculty student={self.student_id} course={self.course_id}>"


class AcademicRecord(Base):
    """
    Time-varying academic inputs per student per term.
    These are the raw values that feed into the ML feature vector.
    """
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.student_id"),
                        nullable=False, index=True)
    term = Column(String(50), nullable=False)         # e.g. "2024-SEM1"
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    attendance = Column(Float, nullable=True)         # percentage 0-100
    marks = Column(Float, nullable=True)              # aggregate marks 0-100
    gpa = Column(Float, nullable=True)                # e.g. 0.0–10.0
    assignment_completion = Column(Float, nullable=True)  # percentage 0-100
    failed_subjects = Column(Integer, nullable=True, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    source = Column(String(50), default="manual",
                    comment="'upload' or 'manual'")

    # Relationships
    student = relationship("StudentProfile", back_populates="academic_records")

    def __repr__(self):
        return f"<AcademicRecord student={self.student_id} term={self.term}>"


class CreditRecord(Base):
    """
    Credit progress per student per period.
    Computed deterministically by the credit engine (SDK Section 9).
    Never modified by the ML model.
    """
    __tablename__ = "credit_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.student_id"),
                        nullable=False, index=True)
    period = Column(String(50), nullable=False)       # e.g. "2024-SEM1"
    earned_credits = Column(Float, nullable=False, default=0.0)
    expected_credits = Column(Float, nullable=False, default=0.0)
    required_credits = Column(Float, nullable=False, default=0.0)
    deficit = Column(Float, nullable=False, default=0.0)
    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    student = relationship("StudentProfile", back_populates="credit_records")

    def __repr__(self):
        return f"<CreditRecord student={self.student_id} period={self.period} deficit={self.deficit}>"


class RiskHistory(Base):
    """
    Append-only risk snapshots. NEVER overwrite a previous score (SDK Section 7).
    Every inference call creates a new row.
    """
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.student_id"),
                        nullable=False, index=True)
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    probability = Column(Float, nullable=False)       # 0.0–1.0
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    model_version = Column(String(50), nullable=False, default="dropout-v1")
    week = Column(Integer, nullable=True,
                  comment="Optional week number for trend chart queries")

    # Relationships
    student = relationship("StudentProfile", back_populates="risk_history")

    def __repr__(self):
        return f"<RiskHistory student={self.student_id} prob={self.probability} level={self.level}>"


class Intervention(Base):
    """
    Action plan triggered by the intervention engine (SDK Section 10).
    Status flows: PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → FOLLOW_UP
    """
    __tablename__ = "interventions"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.student_id"),
                        nullable=False, index=True)
    type = Column(String(50), nullable=False)         # InterventionType string
    reason = Column(Text, nullable=True)
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    priority = Column(String(20), default='MEDIUM')
    due_date = Column(Date, nullable=True)
    status = Column(SAEnum(InterventionStatus),
                    default=InterventionStatus.pending, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    student = relationship("StudentProfile", back_populates="interventions")
    assigned_user = relationship("User", foreign_keys=[assigned_to])
    updates = relationship("InterventionUpdate", back_populates="intervention",
                           order_by="InterventionUpdate.updated_at")

    def __repr__(self):
        return f"<Intervention id={self.id} type={self.type} status={self.status}>"


class InterventionUpdate(Base):
    """
    Audit trail for every status change / note on an intervention.
    Immutable append-only log (actor_id + timestamp).
    """
    __tablename__ = "intervention_updates"

    id = Column(Integer, primary_key=True, index=True)
    intervention_id = Column(Integer, ForeignKey("interventions.id"),
                             nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    status = Column(SAEnum(InterventionStatus), nullable=True)
    note = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)

    # Relationships
    intervention = relationship("Intervention", back_populates="updates")
    actor = relationship("User", back_populates="intervention_updates")

    def __repr__(self):
        return f"<InterventionUpdate intervention={self.intervention_id} actor={self.actor_id}>"
