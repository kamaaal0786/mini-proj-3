import { Link } from 'react-router-dom'
export default function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: 'var(--bg-base)', textAlign: 'center' }}>
      <p style={{ fontSize: '4rem', margin: 0 }}>🔒</p>
      <h1 style={{ color: 'var(--text-primary)', margin: 0 }}>Access Denied</h1>
      <p style={{ color: 'var(--text-muted)' }}>You don't have permission to view this page.</p>
      <Link to="/login" style={{ color: '#3b82f6' }}>← Back to Login</Link>
    </div>
  )
}
