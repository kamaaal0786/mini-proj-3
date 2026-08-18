## Software Development Kit / Technical Specification

AI-Based Credit and Dropout Evaluation System

Implementation contract for frontend, backend, database, ML inference, intervention logic and seeded

data.

## 1. Technical Architecture

Frontend (React) -> FastAPI backend -> domain services -> PostgreSQL. The risk service invokes the saved ML model. Academic updates trigger inference; risk history stores previous scores. Credit and intervention services run alongside the ML service rather than being embedded inside the model.

## 2. Proposed Stack

| Layer | Technology | Use |
| --- | --- | --- |
| Frontend | React + Tailwind CSS | Role dashboards, forms, tables, charts |
| Backend | Python + FastAPI | REST APIs, auth, validation and business logic |
| Database | PostgreSQL | Persistent project data |
| ML | Python, pandas, scikit-learn, XGBoost | Preprocessing, training, evaluation and inference |
|   | candidate |   |
| XAI | SHAP candidate | Model explanation |
| Authentication | JWT | Protected APIs and role access |
| Charts | Recharts/Chart.js candidate | Risk trends and academic analytics |

## 3. Suggested Repository Structure

backend/ app/main.py app/auth/ app/users/ app/students/ app/academics/ app/credits/ app/risk/ app/interventions/ app/uploads/ app/db/ app/schemas/ frontend/ src/pages/ src/components/ src/services/ src/charts/ ml/ train.py preprocess.py evaluate.py model/ data/public/ data/demo/ scripts/seed_demo.py

## 4. Database Tables

| Table | Key fields | Relationship / purpose |
| --- | --- | --- |
| users | id, email, password_hash, role, status | All authenticated users |
| student_profiles | student_id, user_id, roll_no, program, semester, mentor_id | Student identity and primary mentor |
| courses | course_id, name, credits, semester, faculty_id | Course configuration |
| student_faculty | student_id, faculty_id, course_id | Faculty-course assignment |
| academic_records | id, student_id, date/term, attendance, marks, GPA, | Time-varying academic inputs |
|   | assignment_completion, failed_subjects |   |
| credit_records | id, student_id, period, earned, expected, required, deficit | Credit progress |
| risk_history | id, student_id, timestamp, probability, level, model_version | Risk snapshots |
| interventions | id, student_id, type, reason, assigned_to, priority, due_date, | Action plans |
|   | status |   |
| intervention_updates | id, intervention_id, actor_id, timestamp, status, note, outcome | Follow-up/audit trail |

## 5. API Endpoints


| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | /api/auth/login | Login |
| GET | /api/me | Current user/role |
| GET | /api/students | Permitted student list |
| GET | /api/students/{id} | Student detail |
| POST | /api/students | Create student (admin) |
| POST | /api/academic/upload | CSV/XLSX import |
| PATCH | /api/students/{id}/academic | Update academic data |
| POST | /api/risk/{id}/predict | Run current inference |
| GET | /api/risk/{id}/current | Current risk |
| GET | /api/risk/{id}/history | Risk history |
| GET | /api/risk/{id}/explanation | Top risk contributors |
| GET | /api/credits/{id} | Credit status |
| GET | /api/interventions | List interventions |
| POST | /api/interventions | Create/assign intervention |
| PATCH | /api/interventions/{id} | Update status/notes/dates |
| GET | /api/dashboard/summary | Role dashboard KPIs |

## 6. ML Inference Contract

Only pass features supported by the deployed model. The application database can contain additional fields (for example, credits or attendance) that are processed by other services if they are not model features.

```
{ "student_id": "ST001", "risk_probability": 0.72, "risk_level": "HIGH", "model_version": "dropout-v1",
"calculated_at": "ISO-8601 timestamp" }
```

## 7. Risk History

Do not overwrite the previous risk. Store a current score plus dated snapshots. Weekly snapshots should support a trend graph, while event-driven recalculation can update the current score immediately after important academic changes.

```
[ {"week": 1, "risk": 0.31}, {"week": 2, "risk": 0.39}, {"week": 3, "risk": 0.52}, {"week": 4, "risk":
0.72} ]
```

## 8. Explainability Contract

Return model-derived top factors for the current prediction. SHAP is a candidate implementation for compatible models.

The UI should not fabricate explanations; rule-based intervention reasons should be shown separately from model-derived feature contributions.

```
{ "top_factors": [ {"feature":"attendance","impact":"high"},
{"feature":"failed_subjects","impact":"high"}, {"feature":"credit_deficit","impact":"medium"} ] }
```

## 9. Credit Engine

Keep credit computation deterministic and separate from dropout inference unless the selected training dataset explicitly supports credit features.

```
credit_completion = earned_credits / expected_credits * 100 credit_deficit = max(expected_credits -
earned_credits, 0)
```

## 10. Intervention Engine

Rules should be centralized and configurable. Do not scatter thresholds throughout React components.

| Condition | Action constant |
| --- | --- |
| attendance < threshold | ATTENDANCE_PLAN |


| Condition | Action constant |
| --- | --- |
| failed_subjects >= threshold | BACKLOG_PLAN |
| credit_deficit > threshold | CREDIT_RECOVERY_PLAN |
| assignment_completion < threshold | ASSIGNMENT_SUPPORT |
| risk_level == HIGH | MENTOR_REVIEW |

## Intervention status

PENDING -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> FOLLOW_UP

## 11. Upload Pipeline

CSV/XLSX -> schema validation -> row validation -> normalize types/missing values -> persist valid rows -> report errors -> run inference for affected students -> write risk history -> refresh dashboard data.

## 12. Seed Data

Create a repeatable seed script. Suggested setup: 1 admin, 3 mentors, 5 faculty and 30-100 synthetic students. Include healthy, attendance-risk, backlog-risk, credit-deficit, assignment-risk and improving-after-intervention scenarios.

## 13. Frontend Route Map

| Role | Suggested screens/routes |
| --- | --- |
| Admin | /admin, /users, /students, /assignments, /courses, /uploads |
| Faculty | /faculty, /students, /students/:id, /students/:id/academic, /interventions |
| Mentor | /mentor, /at-risk, /students/:id, /interventions |
| Student | /student, /student/risk, /student/credits, /student/actions, /student/progress |

## 14. Security and Access Rules

- Students can retrieve only their own records.

- Faculty can retrieve only assigned students/courses.

- Mentors can retrieve only assigned students.

- Admin can manage users, assignments and system data.

- Protected APIs require authenticated tokens.

- Important academic/risk/intervention actions should be logged.

## 15. Testing

| Area | Minimum check |
| --- | --- |
| Auth/RBAC | Restricted roles cannot access protected screens/endpoints. |
| Upload | Valid file works; malformed rows/columns are reported. |
| ML | Saved model returns reproducible outputs for fixed test rows. |
| Risk history | New snapshot is appended; old snapshots remain. |
| Credits | Completion/deficit calculations are correct. |
| Interventions | Synthetic scenarios trigger expected rules. |
| End-to-end | Upload/update -> risk -> explanation -> action -> follow-up works. |

## 16. 9-Week Technical Plan


| Week | Engineering output |
| --- | --- |
| 1 | Repository, requirements, database schema, environment |
| 2 | Auth, roles, user/assignment APIs |
| 3 | Data pipeline and baseline models |
| 4 | Final model, inference service, metrics |
| 5 | Academic APIs, upload pipeline, dashboard skeleton |
| 6 | Risk history, credits, explainability |
| 7 | Intervention engine and action workflows |
| 8 | Integration, seeded scenarios, security and functional tests |
| 9 | Deployment, docs, demo and final verification |

## 17. Definition of Done

- All four roles authenticate and see role-appropriate views.

- An academic upload/update triggers current risk inference.

- Risk history is preserved and visualized.

- Credit progress and deficit are calculated.

- Model-derived risk explanations appear for supported predictions.

- At least three intervention types can be assigned and tracked.

- The student can see assigned actions.

- The team can reproduce the complete demo from seeded data.

## 18. Team Workstreams

| Workstream | Responsibility |
| --- | --- |
| ML/Data | Dataset, preprocessing, model comparison, evaluation, saved model |
| Backend | FastAPI, PostgreSQL, auth, APIs, upload, intervention rules |
| Frontend | Dashboards, forms, charts, role-specific navigation |
| Integration/QA | Seed data, end-to-end testing, access control, deployment and demo |

## 19. Technical Principle

Keep the ML model responsible for prediction. Keep credit calculations and intervention logic deterministic, testable and explainable. The strongest demo is the complete loop: Predict -> Explain -> Intervene -> Monitor -> Update.
