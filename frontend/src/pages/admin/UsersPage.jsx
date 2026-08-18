/**
 * UsersPage — Admin user management: list, create, toggle status.
 * API: GET/POST /api/users, PATCH /api/users/{id}
 */
import { useState } from 'react'
import { useFetch } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { Plus, X, Shield, BookOpen, UserCheck } from 'lucide-react'

const ROLE_COLOR = { admin: '#f43f5e', faculty: '#3b82f6', mentor: '#10b981', student: '#8b5cf6' }
const ROLE_ICON = { admin: Shield, faculty: BookOpen, mentor: UserCheck }

export default function UsersPage() {
  const { data, loading, error, refetch } = useFetch('/users')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'faculty' })

  const createUser = async (e) => {
    e.preventDefault()
    setSaving(true); setFormErr(null)
    try {
      await api.post('/users', form)
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'faculty' })
      refetch()
    } catch (e) { setFormErr(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  const toggleStatus = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { status: user.status === 'active' ? 'inactive' : 'active' })
      refetch()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
  }

  const users = (data || []).filter(u => u.role !== 'student')

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Create and manage admin, faculty, and mentor accounts</p>
        </div>
        <button id="create-user-btn" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> New User
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Create User</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            {formErr && <ErrorBanner message={formErr} />}
            <form onSubmit={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>{label}</label>
                  <input type={type} required value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', padding: '0.625rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                  <option value="faculty">Faculty</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center', marginTop: '0.25rem' }}>
                {saving ? 'Creating…' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Name', 'Email', 'Role', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const Icon = ROLE_ICON[u.role] || Shield
                const col = ROLE_COLOR[u.role] || '#6b7280'
                return (
                  <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)' }}>{u.name}</td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{u.email}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: `${col}18`, color: col, fontWeight: 600 }}>
                        <Icon size={11} /> {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px',
                        background: u.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                        color: u.status === 'active' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>
                        {u.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <button onClick={() => toggleStatus(u)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem', borderRadius: '0.375rem', cursor: 'pointer',
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        {u.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
