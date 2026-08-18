/**
 * MentorDashboard — live KPIs for assigned students.
 */
import { Link } from 'react-router-dom'
import authService from '../../services/auth'
import { useDashboard } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import { UserCheck } from 'lucide-react'

export default function MentorDashboard() {
  const user = authService.getUser()
  const { data, loading, error } = useDashboard()

  const kpis = [
    { label: 'Assigned Students',  value: data?.total_assigned ?? '—', color: '#10b981' },
    { label: 'High Risk',          value: data?.high_risk      ?? '—', color: '#f43f5e' },
    { label: 'Medium Risk',        value: data?.medium_risk    ?? '—', color: '#f59e0b' },
    { label: 'Open Interventions', value: data?.open_interventions ?? '—', color: '#8b5cf6' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Welcome, <span className="gradient-text">{user?.name}</span></h1>
          <p className="page-subtitle">Overview of your mentored students' wellbeing</p>
        </div>
        <div className="risk-badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
          <UserCheck size={12} /> Mentor
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {loading ? <Spinner /> : kpis.map(({ label, value, color }) => (
          <div key={label} className="kpi-card animate-fade-in-delay">
            <span className="kpi-label">{label}</span>
            <span className="kpi-value" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {[
          { to: '/at-risk',       label: 'At-Risk Students',  desc: 'Students with HIGH or MEDIUM risk' },
          { to: '/interventions', label: 'Intervention Plans', desc: 'Action plans needing your attention' },
        ].map(({ to, label, desc }) => (
          <Link key={to} to={to} className="card-glow" style={{ textDecoration: 'none' }}>
            <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
