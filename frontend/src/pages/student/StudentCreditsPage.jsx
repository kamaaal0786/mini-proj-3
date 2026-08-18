/**
 * StudentCreditsPage — credit progress and deficit visualization.
 */
import authService from '../../services/auth'
import { useCredits } from '../../services/hooks'
import { Spinner, ErrorBanner, ProgressBar } from '../../components/ui'
import { CreditCard } from 'lucide-react'

const STATUS_COLOR = { ON_TRACK: '#10b981', AT_RISK: '#f59e0b', DEFICIT: '#f43f5e' }

export default function StudentCreditsPage() {
  const user = authService.getUser()
  const { data: credits, loading, error } = useCredits(user?.student_id)

  if (loading) return <Spinner text="Loading credits…" />

  const color = STATUS_COLOR[credits?.status] || 'var(--text-muted)'

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Credit Progress</h1>
        <p className="page-subtitle">Track your earned credits against expected and required targets</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {(!credits || credits.status === 'NO_DATA') ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <CreditCard size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ margin: 0 }}>No credit data yet. Ask your faculty to upload academic records.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

          {/* Status card */}
          <div className="card" style={{ textAlign: 'center', borderTop: `4px solid ${color}` }}>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>STATUS</p>
            <p style={{ margin: '0 0 0.25rem', fontSize: '2rem', fontWeight: 800, color }}>
              {credits.status?.replace('_', ' ')}
            </p>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Period: {credits.period}</p>
            <ProgressBar value={credits.completion_pct} color={color} label={`${credits.completion_pct}% Complete`} />
          </div>

          {/* Breakdown */}
          <div className="card">
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>CREDIT BREAKDOWN</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[
                ['Earned Credits',   credits.earned,   '#10b981'],
                ['Expected Credits', credits.expected, '#3b82f6'],
                ['Required Credits', credits.required, '#8b5cf6'],
                ['Deficit',          credits.deficit,  '#f43f5e'],
              ].map(([label, val, col]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color: col, fontSize: '1rem' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Guidance */}
          <div className="card">
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>GUIDANCE</p>
            {credits.status === 'ON_TRACK' && (
              <p style={{ color: '#10b981', fontSize: '0.875rem' }}>✓ Great work! You are on track with your credit requirements. Keep it up!</p>
            )}
            {credits.status === 'AT_RISK' && (
              <p style={{ color: '#f59e0b', fontSize: '0.875rem' }}>⚠ You are slightly behind. Consider speaking with your mentor about a credit recovery plan.</p>
            )}
            {credits.status === 'DEFICIT' && (
              <p style={{ color: '#f43f5e', fontSize: '0.875rem' }}>⚠ You have a credit deficit of <strong>{credits.deficit}</strong>. An intervention plan may already be assigned — check your Action Plan.</p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
