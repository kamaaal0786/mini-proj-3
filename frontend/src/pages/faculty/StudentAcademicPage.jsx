/**
 * StudentAcademicPage — Faculty/Admin: manually edit a student's academic record.
 * PATCH /api/students/{id}/academic
 */
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useStudent } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'

const FIELDS = [
  { key: 'attendance',            label: 'Attendance (%)',         min: 0, max: 100, step: 0.1 },
  { key: 'marks',                 label: 'Marks (%)',              min: 0, max: 100, step: 0.1 },
  { key: 'gpa',                   label: 'GPA (0–10)',             min: 0, max: 10,  step: 0.1 },
  { key: 'assignment_completion', label: 'Assignment Completion (%)', min: 0, max: 100, step: 1 },
  { key: 'failed_subjects',       label: 'Failed Subjects',        min: 0, max: 10,  step: 1 },
  { key: 'earned_credits',        label: 'Earned Credits',         min: 0, max: 200, step: 1 },
  { key: 'expected_credits',      label: 'Expected Credits',       min: 0, max: 200, step: 1 },
  { key: 'required_credits',      label: 'Required Credits',       min: 0, max: 200, step: 1 },
]

export default function StudentAcademicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: student, loading: sLoad } = useStudent(Number(id))

  const [form, setForm] = useState({
    attendance: 75, marks: 65, gpa: 6.0,
    assignment_completion: 70, failed_subjects: 0,
    earned_credits: 25, expected_credits: 30, required_credits: 30,
    term: new Date().getFullYear() + '-SEM' + (new Date().getMonth() < 6 ? 1 : 2),
  })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState(null)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true); setErr(null); setResult(null)
    try {
      const res = await api.patch(`/students/${id}/academic`, {
        ...form,
        attendance: Number(form.attendance),
        marks: Number(form.marks),
        gpa: Number(form.gpa),
        assignment_completion: Number(form.assignment_completion),
        failed_subjects: Number(form.failed_subjects),
        earned_credits: Number(form.earned_credits),
        expected_credits: Number(form.expected_credits),
        required_credits: Number(form.required_credits),
      })
      setResult(res.data)
    } catch (e) { setErr(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  if (sLoad) return <Spinner />

  const RISK_COLOR = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }

  return (
    <div className="animate-fade-in">
      <Link to={`/students/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
        <ArrowLeft size={14} /> Back to {student?.name}
      </Link>

      <div className="page-header">
        <h1 className="page-title">Update Academic Record</h1>
        <p className="page-subtitle">{student?.name} · {student?.roll_no} · {student?.program}</p>
      </div>

      {err && <ErrorBanner message={err} />}

      {result && (() => {
        const rc = RISK_COLOR[result.risk_level] || '#6b7280'
        return (
          <div className="card" style={{ marginBottom: '1.5rem', borderLeft: `3px solid ${rc}` }}>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>✓ Record updated — inference complete</p>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Risk Level</span>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: rc }}>{result.risk_level}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Probability</span>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: rc }}>
                  {Math.round(result.risk_probability * 100)}%
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Credit Status</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--text-secondary)' }}>{result.credit_status}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interventions Triggered</span>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#8b5cf6' }}>{result.interventions_triggered}</p>
              </div>
            </div>
            {result.intervention_note && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ flexShrink: 0 }}>✅</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontWeight: 500, lineHeight: 1.5 }}>
                  {result.intervention_note}
                </p>
              </div>
            )}
          </div>
        )
      })()}

      <form onSubmit={save}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Term</label>
            <input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
              style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
          </div>
          {FIELDS.map(({ key, label, min, max, step }) => (
            <div key={key} className="card">
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
              <input type="number" min={min} max={max} step={step} value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 600, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
            {saving ? <><RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Running inference…</> : <><Save size={14} /> Save & Run Inference</>}
          </button>
          <Link to={`/students/${id}`} className="btn" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
