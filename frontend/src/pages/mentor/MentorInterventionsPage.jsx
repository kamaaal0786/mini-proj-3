/**
 * MentorInterventionsPage — Review & action intervention plans for mentored students.
 *
 * PURPOSE (different from faculty):
 *   Faculty  → CREATES intervention plans based on academic analysis
 *   Mentor   → REVIEWS plans, adds outcome notes, marks completion
 *
 * Mentors cannot create new plans — that's the faculty's role.
 * They CAN update status (ASSIGNED → IN_PROGRESS → COMPLETED) and add outcome notes.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInterventions } from '../../services/hooks'
import { IVStatusBadge, Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { ChevronRight, ClipboardCheck, AlertCircle } from 'lucide-react'

// Statuses a mentor can transition to
const MENTOR_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FOLLOW_UP']

const PRIORITY_COLOR = { HIGH: '#f43f5e', CRITICAL: '#e11d48', MEDIUM: '#f59e0b', LOW: '#10b981' }

export default function MentorInterventionsPage() {
  const { data, loading, error, refetch } = useInterventions()
  const [updating, setUpdating] = useState(null)
  const [notes, setNotes]       = useState({}) // { [iv_id]: note text }
  const [expanded, setExpanded] = useState({}) // { [iv_id]: bool }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.patch(`/interventions/${id}`, {
        status,
        note: notes[id] || undefined,
      })
      setNotes(prev => ({ ...prev, [id]: '' }))
      refetch()
    } catch (e) { alert(e.response?.data?.detail || 'Update failed') }
    finally { setUpdating(null) }
  }

  // Group by student
  const byStudent = {}
  ;(data || []).forEach(iv => {
    const key = iv.student_id
    if (!byStudent[key]) byStudent[key] = {
      name: iv.student_name || `Student #${iv.student_id}`,
      sid: key, items: [],
    }
    byStudent[key].items.push(iv)
  })

  const groups = Object.values(byStudent)

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Intervention Plans</h1>
          <p className="page-subtitle">Review and action plans for your mentored students</p>
        </div>
      </div>

      {/* Role explanation banner */}
      <div className="card" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start', borderLeft: '3px solid #3b82f6' }}>
        <ClipboardCheck size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Your role as Mentor</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Faculty creates intervention plans based on academic data. You review these plans, 
            meet with students, and update their progress status here. Add outcome notes to 
            document what actions were taken.
          </p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading ? <Spinner /> : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p style={{ margin: 0 }}>No intervention plans assigned yet.</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem' }}>Plans will appear here when faculty assigns them to your students.</p>
        </div>
      ) : (
        groups.map(({ name, sid, items }) => {
          const pending = items.filter(i => i.status === 'PENDING' || i.status === 'ASSIGNED').length
          return (
            <div key={sid} className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#8b5cf6' }}>
                    {name[0]}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{name}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {items.length} plan{items.length !== 1 ? 's' : ''} · 
                      {pending > 0 ? <span style={{ color: '#f59e0b' }}> {pending} need attention</span> : <span style={{ color: '#10b981' }}> all actioned</span>}
                    </p>
                  </div>
                </div>
                <Link to={`/mentor/students/${sid}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'none' }}>
                  View Profile <ChevronRight size={12} />
                </Link>
              </div>

              {items.map(iv => (
                <div key={iv.id} style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
                    <IVStatusBadge status={iv.status} />
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: PRIORITY_COLOR[iv.priority] || '#6b7280' }}>
                      {iv.priority}
                    </span>
                    <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', minWidth: 140 }}>
                      {iv.type?.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 240 }}>{iv.reason}</span>

                    {/* Status control */}
                    <select
                      value={iv.status}
                      disabled={updating === iv.id}
                      onChange={e => updateStatus(iv.id, e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.3rem 0.55rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      {MENTOR_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>

                    <button
                      onClick={() => setExpanded(prev => ({ ...prev, [iv.id]: !prev[iv.id] }))}
                      style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem' }}>
                      {expanded[iv.id] ? 'Hide note' : 'Add note'}
                    </button>
                  </div>

                  {expanded[iv.id] && (
                    <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem' }}>
                      <input
                        placeholder="Outcome note (optional)…"
                        value={notes[iv.id] || ''}
                        onChange={e => setNotes(prev => ({ ...prev, [iv.id]: e.target.value }))}
                        style={{ flex: 1, padding: '0.4rem 0.65rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: '0.8rem' }}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                        disabled={updating === iv.id}
                        onClick={() => updateStatus(iv.id, iv.status)}>
                        Save Note
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
