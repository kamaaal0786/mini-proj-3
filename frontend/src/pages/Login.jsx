/**
 * Login page — premium dark-themed entry point.
 * Redirects to role-specific dashboard after successful authentication.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import authService from '../services/auth'
import { Brain, Mail, Lock, ArrowRight, Loader } from 'lucide-react'

const ROLE_REDIRECT = {
  admin:   '/admin',
  faculty: '/faculty',
  mentor:  '/mentor',
  student: '/student',
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await authService.login(email, password)
      const redirect = ROLE_REDIRECT[data.role] || '/student'
      navigate(redirect, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Login failed. Please check your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card animate-fade-in">

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={28} color="#3b82f6" />
          </div>
          <h1 style={{
            margin: '0 0 0.25rem',
            fontSize: '1.5rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            AcademiQ
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            AI-Based Credit & Dropout Evaluation System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {error && (
            <div className="alert alert-error animate-fade-in">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Mail size={13} /> Email address
              </span>
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <Lock size={13} /> Password
              </span>
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem' }}
          >
            {loading ? (
              <><Loader size={16} className="animate-spin" /> Signing in…</>
            ) : (
              <>Sign in <ArrowRight size={16} /></>
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: '1.75rem',
          padding: '1rem',
          background: 'var(--bg-elevated)',
          borderRadius: '0.5rem',
          border: '1px solid var(--border)',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Demo Credentials
          </p>
          {[
            { role: 'Admin',   email: 'admin@college.edu',    color: '#8b5cf6' },
            { role: 'Faculty', email: 'faculty1@college.edu', color: '#06b6d4' },
            { role: 'Mentor',  email: 'mentor1@college.edu',  color: '#10b981' },
            { role: 'Student', email: 'student001@college.edu', color: '#3b82f6' },
          ].map(({ role, email: demoEmail, color }) => (
            <button
              key={role}
              type="button"
              onClick={() => { setEmail(demoEmail); setPassword('Demo@1234') }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', background: 'none', border: 'none',
                padding: '0.25rem 0', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '0.8rem',
              }}
            >
              <span style={{ color, fontWeight: 600 }}>{role}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{demoEmail}</span>
            </button>
          ))}
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Password for all: <code style={{ color: 'var(--text-secondary)' }}>Demo@1234</code>
          </p>
        </div>

      </div>
    </div>
  )
}
