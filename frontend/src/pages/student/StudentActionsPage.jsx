/**
 * StudentActionsPage — personal intervention / action plan cards.
 */
import authService from '../../services/auth'
import { useInterventions } from '../../services/hooks'
import { Spinner, ErrorBanner, IVStatusBadge } from '../../components/ui'
import { Target, CheckCircle, Clock } from 'lucide-react'

const TYPE_ICONS = {
  ATTENDANCE_PLAN: '📅',
  BACKLOG_PLAN: '📚',
  CREDIT_RECOVERY_PLAN: '🎯',
  ASSIGNMENT_SUPPORT: '📝',
  MENTOR_REVIEW: '👥',
}

const PRIORITY_COLOR = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }

export default function StudentActionsPage() {
  const user = authService.getUser()
  const { data, loading, error } = useInterventions()

  const open      = (data || []).filter(iv => iv.status !== 'COMPLETED' && iv.status !== 'FOLLOW_UP')
  const completed = (data || []).filter(iv => iv.status === 'COMPLETED' || iv.status === 'FOLLOW_UP')

  if (loading) return <Spinner text="Loading action plan…" />

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Action Plan</h1>
        <p className="page-subtitle">Intervention plans assigned to support your academic progress</p>
      </div>

      {error && <ErrorBanner message={error} />}

      {(data || []).length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle size={40} color="#10b981" style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 0.25rem' }}>All clear!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>No intervention plans assigned yet.</p>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Clock size={13} /> Open Actions ({open.length})
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {open.map(iv => (
                  <div key={iv.id} className="card" style={{ borderLeft: `3px solid ${PRIORITY_COLOR[iv.priority] || '#6b7280'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '1.25rem' }}>{TYPE_ICONS[iv.type] || '📋'}</span>
                      <IVStatusBadge status={iv.status} />
                    </div>
                    <p style={{ margin: '0 0 0.375rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                      {iv.type?.replace(/_/g, ' ')}
                    </p>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{iv.reason}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ color: PRIORITY_COLOR[iv.priority], fontWeight: 700 }}>{iv.priority} priority</span>
                      {iv.due_date && <span>Due: {iv.due_date}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <CheckCircle size={13} /> Completed ({completed.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {completed.map(iv => (
                  <div key={iv.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.7 }}>
                    <CheckCircle size={16} color="#10b981" />
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.875rem', flex: 1 }}>
                      {iv.type?.replace(/_/g, ' ')}
                    </span>
                    <IVStatusBadge status={iv.status} />
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
