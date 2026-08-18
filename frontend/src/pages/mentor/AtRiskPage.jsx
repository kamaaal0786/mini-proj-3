/**
 * AtRiskPage — mentor view of all students with risk ≥ MEDIUM, sorted by probability.
 */
import { Link } from 'react-router-dom'
import { useStudents } from '../../services/hooks'
import { RiskBadge, Spinner, ErrorBanner, ProgressBar } from '../../components/ui'
import { ChevronRight, AlertTriangle } from 'lucide-react'

export default function AtRiskPage() {
  const { data, loading, error } = useStudents()

  const atRisk = (data || [])
    .filter(s => s.latest_risk_level === 'HIGH' || s.latest_risk_level === 'MEDIUM')
    .sort((a, b) => (b.latest_risk_probability ?? 0) - (a.latest_risk_probability ?? 0))

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertTriangle size={22} color="#f43f5e" /> At-Risk Students
        </h1>
        <p className="page-subtitle">Students with HIGH or MEDIUM dropout risk, sorted by probability</p>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : atRisk.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <p style={{ margin: 0 }}>No at-risk students found. Upload academic data to compute risk scores.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {atRisk.map(s => (
            <div key={s.student_id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{s.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{s.roll_no}</span>
                  <RiskBadge level={s.latest_risk_level} />
                </div>
                {s.latest_risk_probability != null && (
                  <ProgressBar
                    value={Math.round(s.latest_risk_probability * 100)}
                    color={s.latest_risk_level === 'HIGH' ? '#f43f5e' : '#f59e0b'}
                    label={`Risk Probability: ${Math.round(s.latest_risk_probability * 100)}%`}
                  />
                )}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {s.program} · Sem {s.semester}
              </div>
              <Link to={`/mentor/students/${s.student_id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#3b82f6', fontSize: '0.8125rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                View <ChevronRight size={12} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
