/**
 * StudentDashboard — personal overview with live risk, credits, and open actions.
 */
import { Link } from 'react-router-dom'
import authService from '../../services/auth'
import { useDashboard } from '../../services/hooks'
import { Spinner, ErrorBanner, ProgressBar } from '../../components/ui'
import { TrendingUp, CreditCard, Target, BookOpen } from 'lucide-react'

const RISK_COLOR = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }

export default function StudentDashboard() {
  const user = authService.getUser()
  const { data, loading, error } = useDashboard()

  const riskColor = RISK_COLOR[data?.risk_level] || 'var(--text-muted)'

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hello, <span className="gradient-text">{user?.name}</span></h1>
          <p className="page-subtitle">Your academic health summary</p>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {loading ? <Spinner /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {/* Risk level */}
            <div className="card" style={{ textAlign: 'center', borderTop: `3px solid ${riskColor}` }}>
              <TrendingUp size={22} color={riskColor} style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800, color: riskColor }}>
                {data?.risk_level ?? '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Dropout Risk</p>
              {data?.risk_probability != null && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: riskColor }}>
                  {Math.round(data.risk_probability * 100)}% probability
                </p>
              )}
            </div>

            {/* Credit completion */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                <CreditCard size={14} /> Credit Progress
              </div>
              {data?.credit_completion_pct != null ? (
                <>
                  <ProgressBar value={data.credit_completion_pct}
                    color={data.credit_status === 'ON_TRACK' ? '#10b981' : data.credit_status === 'AT_RISK' ? '#f59e0b' : '#f43f5e'} />
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Status: <strong style={{ color: 'var(--text-secondary)' }}>{data.credit_status?.replace('_', ' ')}</strong>
                  </p>
                </>
              ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>No credit data yet.</p>}
            </div>

            {/* Open actions */}
            <div className="card" style={{ textAlign: 'center' }}>
              <Target size={22} color="#8b5cf6" style={{ marginBottom: '0.5rem' }} />
              <p style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800, color: '#8b5cf6' }}>
                {data?.open_actions ?? '—'}
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Open Actions</p>
            </div>
          </div>

          {/* Quick links */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {[
              { to: '/student/risk',     icon: TrendingUp, label: 'Risk Details',    color: riskColor },
              { to: '/student/credits',  icon: CreditCard, label: 'Credit Progress', color: '#3b82f6' },
              { to: '/student/actions',  icon: Target,     label: 'Action Plan',     color: '#8b5cf6' },
              { to: '/student/progress', icon: BookOpen,   label: 'Academic Data',   color: '#10b981' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to} className="card-glow" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={18} color={color} />
                <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
