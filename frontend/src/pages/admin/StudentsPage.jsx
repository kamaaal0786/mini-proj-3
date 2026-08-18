/**
 * StudentsPage (Admin) — full list with search, risk badge, and "Add Student" modal.
 * Modal: scrollable, opens near top so dropdowns don't clip.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFetch } from '../../services/hooks'
import { RiskBadge, Spinner, ErrorBanner } from '../../components/ui'
import { Search, ChevronRight, Plus, X } from 'lucide-react'
import api from '../../services/api'

const FIELD_STYLE = {
  width: '100%', padding: '0.55rem 0.75rem',
  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
  borderRadius: '0.5rem', color: 'var(--text-primary)',
  fontSize: '0.875rem', boxSizing: 'border-box',
}

export default function StudentsAdminPage() {
  const { data, loading, error, refetch } = useFetch('/students')
  const { data: mentors }                 = useFetch('/users?role=mentor')
  const [q, setQ]           = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [formErr, setFormErr] = useState(null)
  const [form, setForm]       = useState({
    name: '', email: '', password: 'Demo@1234',
    roll_no: '', program: 'B.Tech CS', semester: 1, mentor_id: '',
  })

  const students = (data || []).filter(s =>
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(q.toLowerCase()) ||
    s.program?.toLowerCase().includes(q.toLowerCase())
  )

  const createStudent = async (e) => {
    e.preventDefault()
    setSaving(true); setFormErr(null)
    try {
      await api.post('/students', {
        ...form,
        semester:  Number(form.semester),
        mentor_id: form.mentor_id ? Number(form.mentor_id) : null,
      })
      setShowForm(false)
      setForm({ name: '', email: '', password: 'Demo@1234', roll_no: '', program: 'B.Tech CS', semester: 1, mentor_id: '' })
      refetch()
    } catch (e) { setFormErr(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{data?.length ?? 0} enrolled students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> Add Student</button>
      </div>

      {error && <ErrorBanner message={error} />}

      {/* Modal — fixed overlay, content scrollable, anchored near top */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 100, overflowY: 'auto', padding: '2rem 1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 460, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add New Student</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {formErr && <ErrorBanner message={formErr} />}
            <form onSubmit={createStudent} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

              {[['Full Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'text'], ['Roll No', 'roll_no', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
                  <input type={type} required value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={FIELD_STYLE} />
                </div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Program</label>
                  <select value={form.program} onChange={e => setForm(f => ({ ...f, program: e.target.value }))} style={FIELD_STYLE}>
                    {['B.Tech CS', 'B.Tech ME', 'B.Tech ECE', 'B.Tech EEE', 'B.Tech Civil', 'BCA', 'MCA', 'MBA'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Semester</label>
                  <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} style={FIELD_STYLE}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Assign Mentor <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(optional)</span></label>
                <select value={form.mentor_id} onChange={e => setForm(f => ({ ...f, mentor_id: e.target.value }))} style={FIELD_STYLE}>
                  <option value="">— None —</option>
                  {(mentors || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                {saving ? 'Creating…' : 'Create Student'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
          placeholder="Search by name, roll no, or program…" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Name', 'Roll No', 'Program', 'Sem', 'Risk', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No students found.</td></tr>
                : students.map(s => (
                  <tr key={s.student_id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{s.name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.roll_no}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{s.program}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{s.semester}</td>
                    <td style={{ padding: '0.75rem 1rem' }}><RiskBadge level={s.latest_risk_level} /></td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '999px',
                        background: s.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(100,100,100,0.1)',
                        color: s.status === 'active' ? '#10b981' : '#6b7280', fontWeight: 600 }}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Link to={`/students/${s.student_id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: '#3b82f6', fontSize: '0.8rem', textDecoration: 'none' }}>
                        View <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
