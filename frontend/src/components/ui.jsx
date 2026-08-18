/** Reusable risk badge chip. */
const COLORS = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }

export function RiskBadge({ level }) {
  if (!level) return <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
  const color = COLORS[level] || '#6b7280'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      background: `${color}18`, color, fontWeight: 700,
      fontSize: '0.75rem', letterSpacing: '0.04em',
    }}>
      {level === 'HIGH' ? '⚠' : level === 'MEDIUM' ? '●' : '✓'} {level}
    </span>
  )
}

/** Loading spinner */
export function Spinner({ text = 'Loading…' }) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', margin: '0 auto 0.75rem',
        border: '3px solid var(--border)', borderTopColor: '#3b82f6',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ margin: 0, fontSize: '0.875rem' }}>{text}</p>
    </div>
  )
}

/** Error banner */
export function ErrorBanner({ message }) {
  return (
    <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
      ⚠ {message}
    </div>
  )
}

/** Progress bar */
export function ProgressBar({ value, max = 100, color = '#3b82f6', label }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color }}>{value}%</span>
        </div>
      )}
      <div style={{
        height: 8, borderRadius: 4, background: 'var(--bg-elevated)',
        overflow: 'hidden', border: '1px solid var(--border)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}

/** Intervention status badge */
const IV_COLORS = {
  PENDING: '#f59e0b', ASSIGNED: '#3b82f6',
  IN_PROGRESS: '#8b5cf6', COMPLETED: '#10b981', FOLLOW_UP: '#06b6d4',
}
export function IVStatusBadge({ status }) {
  const color = IV_COLORS[status] || '#6b7280'
  return (
    <span style={{
      padding: '0.15rem 0.5rem', borderRadius: '999px',
      background: `${color}18`, color, fontWeight: 600, fontSize: '0.7rem',
    }}>
      {(status || '').replace('_', ' ')}
    </span>
  )
}
