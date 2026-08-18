## Product Requirements Document

AI-Based Credit and Dropout Evaluation System

Defines the product scope, user roles, features, workflows, requirements and acceptance criteria.

## 1. Product Overview

A web-based academic early-intervention platform that uses student academic data to estimate dropout risk, explain important risk factors, evaluate credit progress, recommend structured interventions, and track changes over time.

Core loop: Data -> Predict -> Explain -> Evaluate credits -> Intervene -> Monitor -> Update risk.

## 2. Problem Statement

Students who are gradually falling behind may not be identified early enough through manual academic monitoring. The system is intended to provide an early warning and support workflow for faculty and mentors.

## 3. Product Goals

- Provide a current dropout-risk probability and Low/Medium/High risk category.

- Explain the main factors contributing to the current prediction.

- Track earned, expected/required credits and credit deficit/backlog.

- Allow authorized users to upload or update academic data.

- Maintain risk history so risk changes can be visualized across weeks.

- Generate structured intervention plans based on identifiable risk drivers.

- Allow faculty/mentors to assign and track interventions.

- Give students a private dashboard with their status and action plan.

- Use real/public data for model evaluation and synthetic institutional data for demonstration where needed.

## 4. Users and Roles

| Role | Purpose | Main capabilities |
| --- | --- | --- |
| Admin | System/data management | Users, assignments, courses, credits, bulk upload, overview |
| Faculty/Teacher | Course-level monitoring | Academic updates, assigned students, risk, interventions |
| Mentor | Overall student support | Risk trends, credit deficits, counselling, follow-up |
| Student | Self-monitoring | Own risk, academics, credits, reasons, action plan |

## 5. Scope

In scope: authentication, role-based access, student profiles, academic import/update, ML inference, risk history, explainability, credit evaluation, intervention engine, intervention tracking, dashboards, admin management and seeded demo data.

Not in the first release: face recognition, emotion detection, blockchain, IoT, general-purpose chatbot and unnecessary deep-learning complexity.

## 6. Functional Requirements

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-01 | Authentication/RBAC | Users log in and only permitted screens/data are accessible. |


| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| FR-02 | User management | Admin can create/manage students, faculty and mentors. |
| FR-03 | Assignments | Admin can assign mentors and faculty-course relationships. |
| FR-04 | CSV/XLSX upload | Valid template accepted; invalid structure/rows reported. |
| FR-05 | Manual update | Authorized academic edits trigger risk recalculation. |
| FR-06 | Dropout prediction | Saved model returns probability and risk level. |
| FR-07 | Risk history | New snapshots are stored without deleting earlier scores. |
| FR-08 | Explainability | Current prediction shows model-derived important factors. |
| FR-09 | Credit evaluation | Earned, expected/required, completion and deficit are shown. |
| FR-10 | Intervention rules | Risk conditions generate relevant action plans. |
| FR-11 | Intervention workflow | Actions can be assigned, updated, completed and followed up. |
| FR-12 | Student dashboard | Student can view risk, academics, credits and action plan. |
| FR-13 | Faculty/Mentor dashboard | Assigned students, risks, factors, credits and interventions are visible. |
| FR-14 | Monitoring | Risk/academic changes after new data are visible. |
| FR-15 | Reports | Basic risk/intervention export can be added if time permits. |

## 7. Data Model

| Entity | Example fields |
| --- | --- |
| User | id, name, email, password_hash, role, status |
| Student | student_id, roll_no, program, semester, mentor_id |
| Academic Record | student_id, date/term, attendance, marks, GPA/SGPA, assignment completion, failed subjects |
| Credit Record | student_id, period, earned_credits, expected_credits, required_credits, deficit |
| Risk History | student_id, timestamp/week, probability, level, model_version |
| Intervention | student_id, type, reason, assigned_to, priority, due_date, status, outcome |
| Course | course_id, name, credits, semester, faculty_id |

## 8. ML and Data Strategy

- Train/evaluate on a real public higher-education dropout dataset.

- Keep synthetic college-style data for application demonstration rather than presenting it as real institutional evidence.

- Do not blindly merge unrelated public and synthetic datasets for model training.

- Train the model offline and load the saved model for inference.

- Compare candidate models such as Logistic Regression, Random Forest and XGBoost; select using actual validation/test results.

- Risk thresholds must be documented and validated for the project.

## 9. Intervention Rules

| Condition | Action plan | Owner | Review |
| --- | --- | --- | --- |
| Attendance below configured | Attendance Improvement | Faculty/Mentor | Weekly |
| threshold |   |   |   |
| Multiple failed subjects/backlog | Academic Backlog | Mentor/Faculty | 1-2 weeks |
| Credit progress below expected | Credit Recovery | Mentor/Coordinator | 2-4 weeks |
| Low assignment completion | Assignment Support | Faculty | 1-2 weeks |


| Condition | Action plan | Owner | Review |
| --- | --- | --- | --- |
| High overall dropout risk | Mentor/Faculty Review | Mentor | Priority |

## 10. Dashboard Requirements

Student: risk, trend, academic health, credits, top risk factors, action plan, intervention status and progress.

Faculty/Mentor: risk distribution, assigned students, risk trends, top factors, credit deficits, pending interventions and student detail pages.

Admin: user/assignment/course management, bulk upload and high-level statistics.

## 11. Main User Flow

Admin creates users/assignments -> faculty/mentor uploads or updates academic data -> backend validates/stores data -> ML model calculates risk -> risk history is saved -> explanation identifies important factors -> credit engine calculates progress -> intervention engine recommends actions -> faculty/mentor assigns intervention -> student sees action plan -> new data arrives -> risk recalculates -> progress is monitored.

## 12. Non-Functional Requirements

- Role-based security and least-privilege data access.

- Passwords stored as secure hashes and protected API routes.

- Timestamp important risk and intervention changes.

- Separate frontend, backend, database and ML inference modules.

- Invalid uploads must not silently corrupt stored records.

- Synthetic demonstration identities should be clearly separated from real student records.

## 13. Success Criteria

- A demo user can go from data upload/update to a new risk score.

- A student can have multiple stored risk snapshots and a visible trend.

- At least three intervention types work end-to-end.

- Student and faculty/mentor permissions are enforced.

- ML evaluation is reproducible on the selected public dataset.

- Credit progress and intervention status are visible in the relevant dashboards.

## 14. 9-Week Delivery

| Week | Milestone |
| --- | --- |
| 1 | Requirements freeze, database schema, dataset and environment |
| 2 | Authentication, roles, assignments and academic schema |
| 3 | Preprocessing and baseline ML experiments |
| 4 | Final model, inference API and evaluation |
| 5 | Backend academic APIs, upload and dashboard skeleton |
| 6 | Risk history, credit engine and explainability |
| 7 | Intervention engine and user workflows |
| 8 | Integration, seeded scenarios and testing |
| 9 | Deployment, documentation, final demo and polish |


## 15. Product Principle

Do not stop at 'student is high risk'. The product must make visible why the risk is high, what academic issue is involved, who should act, what action is assigned, and whether the student's indicators change over time.
