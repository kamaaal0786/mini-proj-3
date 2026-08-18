/**
 * FacultyStudentsPage — list of assigned students with live risk badges.
 */
import { Link } from 'react-router-dom'
import { useStudents } from '../../services/hooks'
import { RiskBadge, Spinner, ErrorBanner } from '../../components/ui'
import { Search, ChevronRight } from 'lucide-react'
import { useState } from 'react'

export default function FacultyStudentsPage() {
  const { data, loading, error } = useStudents()
  const [q, setQ] = useState('')

  const students = (data || []).filter(s =>
    s.name?.toLowerCase().includes(q.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Students</h1>
        <p className="page-subtitle">Assigned students in your courses</p>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          style={{ width: '100%', padding: '0.625rem 0.875rem 0.625rem 2.25rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }}
          placeholder="Search by name or roll no…"
          value={q} onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Name', 'Roll No', 'Program', 'Semester', 'Risk', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No students found.</td></tr>
              ) : students.map((s, i) => (
                <tr key={s.student_id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{s.name}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{s.roll_no}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{s.program}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>Sem {s.semester}</td>
                  <td style={{ padding: '0.75rem 1rem' }}><RiskBadge level={s.latest_risk_level} /></td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Link to={`/students/${s.student_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', fontSize: '0.8125rem', textDecoration: 'none' }}>
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
