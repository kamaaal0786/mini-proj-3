/**
 * AssignmentsPage — Admin: two tabs:
 *   1. Mentor Assignment (assign mentor to student)
 *   2. Faculty Assignment (assign faculty+course to student)
 *
 * API: PATCH /api/users/{sid}/assign-mentor
 *      POST  /api/users/{sid}/assign-faculty
 */
import { useState } from 'react'
import { useFetch, useCourses } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { UserCheck, Search, BookOpen, CheckCircle } from 'lucide-react'

const INPUT = {
  padding: '0.4rem 0.65rem', background: 'var(--bg-elevated)',
  border: '1px solid var(--border)', borderRadius: '0.375rem',
  color: 'var(--text-primary)', fontSize: '0.8125rem', cursor: 'pointer',
}

export default function AssignmentsPage() {
  const { data: students, loading: sLoad }  = useFetch('/students')
  const { data: mentors }                   = useFetch('/users?role=mentor')
  const { data: faculty }                   = useFetch('/users?role=faculty')
  const { data: courses }                   = useCourses()

  const [tab, setTab]       = useState('mentor')  // 'mentor' | 'faculty'
  const [q, setQ]           = useState('')
  const [saving, setSaving] = useState(null)
  const [toast, setToast]   = useState(null)
  const [err, setErr]       = useState(null)

  // Faculty assignment form state
  const [facForm, setFacForm] = useState({}) // { [student_id]: { faculty_id, course_id } }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const filtered = (students || []).filter(s =>
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(q.toLowerCase())
  )

  const assignMentor = async (studentId, mentorId) => {
    setSaving(`m-${studentId}`); setErr(null)
    try {
      await api.patch(`/users/${studentId}/assign-mentor`,
        { mentor_id: mentorId ? Number(mentorId) : null })
      showToast('Mentor assigned ✓')
    } catch (e) { setErr(e.response?.data?.detail || e.message) }
    finally { setSaving(null) }
  }

  const assignFaculty = async (studentId) => {
    const f = facForm[studentId] || {}
    if (!f.faculty_id || !f.course_id) {
      setErr('Select both faculty and course before assigning'); return
    }
    setSaving(`f-${studentId}`); setErr(null)
    try {
      const res = await api.post(`/users/${studentId}/assign-faculty`, {
        faculty_id: Number(f.faculty_id),
        course_id:  Number(f.course_id),
      })
      showToast(res.data.message || 'Faculty assigned ✓')
      setFacForm(prev => ({ ...prev, [studentId]: {} }))
    } catch (e) { setErr(e.response?.data?.detail || e.message) }
    finally { setSaving(null) }
  }

  const tabBtn = (id, label, Icon) => (
    <button onClick={() => setTab(id)} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
      padding: '0.55rem 1.1rem', borderRadius: '0.5rem', fontSize: '0.875rem',
      fontWeight: tab === id ? 700 : 500, cursor: 'pointer',
      background: tab === id ? 'rgba(139,92,246,0.15)' : 'transparent',
      border: tab === id ? '1px solid rgba(139,92,246,0.4)' : '1px solid transparent',
      color: tab === id ? '#8b5cf6' : 'var(--text-muted)',
      transition: 'all 0.15s',
    }}>
      <Icon size={14} />{label}
    </button>
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Assignments</h1>
        <p className="page-subtitle">Assign mentors and faculty to students</p>
      </div>

      {err && <ErrorBanner message={err} />}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 200,
          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
          color: '#10b981', padding: '0.75rem 1.25rem', borderRadius: '0.75rem',
          fontWeight: 600, fontSize: '0.875rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle size={14} style={{ display: 'inline', marginRight: '0.4rem' }} />
          {toast}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {tabBtn('mentor',  'Mentor Assignment',  UserCheck)}
        {tabBtn('faculty', 'Faculty Assignment', BookOpen)}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
          placeholder="Search students…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {sLoad ? <Spinner /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {(tab === 'mentor'
                  ? ['Student', 'Roll No', 'Program', 'Assigned Mentor']
                  : ['Student', 'Roll No', 'Program', 'Assign Faculty', 'Course', '']
                ).map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.student_id} style={{ borderTop: '1px solid var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Student name */}
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6' }}>
                        {s.name?.[0]}
                      </div>
                      {s.name}
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.roll_no}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{s.program}</td>

                  {tab === 'mentor' ? (
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <select
                        defaultValue={s.mentor_id || ''}
                        disabled={saving === `m-${s.student_id}`}
                        onChange={e => assignMentor(s.student_id, e.target.value)}
                        style={{ ...INPUT, minWidth: 200 }}>
                        <option value="">— Unassigned —</option>
                        {(mentors || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      {saving === `m-${s.student_id}` && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>saving…</span>}
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <select
                          value={facForm[s.student_id]?.faculty_id || ''}
                          onChange={e => setFacForm(prev => ({ ...prev, [s.student_id]: { ...(prev[s.student_id] || {}), faculty_id: e.target.value } }))}
                          style={{ ...INPUT, minWidth: 170 }}>
                          <option value="">— Faculty —</option>
                          {(faculty || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <select
                          value={facForm[s.student_id]?.course_id || ''}
                          onChange={e => setFacForm(prev => ({ ...prev, [s.student_id]: { ...(prev[s.student_id] || {}), course_id: e.target.value } }))}
                          style={{ ...INPUT, minWidth: 170 }}>
                          <option value="">— Course —</option>
                          {(courses || []).map(c => <option key={c.course_id} value={c.course_id}>{c.code} · {c.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          disabled={saving === `f-${s.student_id}`}
                          onClick={() => assignFaculty(s.student_id)}
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                          {saving === `f-${s.student_id}` ? 'Saving…' : 'Assign'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
