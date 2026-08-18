/**
 * FacultyInterventionsPage — view, create, and update interventions.
 * Phase 3: added "Create Intervention" modal + POST /api/interventions.
 */
import { useState } from 'react'
import { useInterventions, useStudents } from '../../services/hooks'
import { IVStatusBadge, Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { Plus, X } from 'lucide-react'

const STATUSES    = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FOLLOW_UP']
const IV_TYPES    = ['ATTENDANCE_PLAN', 'BACKLOG_PLAN', 'CREDIT_RECOVERY_PLAN', 'ASSIGNMENT_SUPPORT', 'MENTOR_REVIEW']
const PRIORITIES  = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function FacultyInterventionsPage() {
  const { data, loading, error, refetch } = useInterventions()
  const { data: students } = useStudents()

  const [updating, setUpdating] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [formErr,  setFormErr]  = useState(null)
  const [form, setForm] = useState({
    student_id: '', type: 'ATTENDANCE_PLAN', reason: '', priority: 'MEDIUM', due_date: '',
  })

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.patch(`/interventions/${id}`, { status })
      refetch()
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed')
    } finally {
      setUpdating(null)
    }
  }

  const createIntervention = async (e) => {
    e.preventDefault()
    setSaving(true); setFormErr(null)
    try {
      await api.post('/interventions', {
        student_id: Number(form.student_id),
        type:       form.type,
        reason:     form.reason,
        priority:   form.priority,
        due_date:   form.due_date || undefined,
      })
      setShowForm(false)
      setForm({ student_id: '', type: 'ATTENDANCE_PLAN', reason: '', priority: 'MEDIUM', due_date: '' })
      refetch()
    } catch (e) { setFormErr(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  // Group interventions by student
  const byStudent = {}
  ;(data || []).forEach(iv => {
    const key = iv.student_id
    if (!byStudent[key]) byStudent[key] = { name: iv.student_name || `Student #${iv.student_id}`, sid: key, items: [] }
    byStudent[key].items.push(iv)
  })

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Interventions</h1>
          <p className="page-subtitle">Manage and update action plans for your students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Create Plan</button>
      </div>

      {/* Create modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: 440, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>New Intervention Plan</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {formErr && <ErrorBanner message={formErr} />}
            <form onSubmit={createIntervention} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Student</label>
                <select required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  <option value="">— Select student —</option>
                  {(students || []).map(s => <option key={s.student_id} value={s.student_id}>{s.name} ({s.roll_no})</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  {IV_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Reason</label>
                <textarea required rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
                {saving ? 'Creating…' : 'Create Intervention'}
              </button>
            </form>
          </div>
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : Object.values(byStudent).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: '0 0 0.75rem' }}>No interventions found for your assigned students.</p>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={14} /> Create First Plan</button>
        </div>
      ) : (
        Object.values(byStudent).map(({ name, sid, items }) => (
          <div key={sid} className="card" style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{name}</p>
            {items.map(iv => (
              <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.5rem 0', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                <IVStatusBadge status={iv.status} />
                <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 120 }}>{iv.type?.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 260 }}>{iv.reason}</span>
                <select value={iv.status} disabled={updating === iv.id}
                  onChange={e => updateStatus(iv.id, e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.55rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}
