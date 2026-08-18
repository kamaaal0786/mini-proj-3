import { Link } from 'react-router-dom'
import authService from '../../services/auth'
import { useDashboard } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import { Users, GraduationCap, UserCheck, BookOpen, Upload, Shield, AlertTriangle } from 'lucide-react'

const TILES = [
  { to: '/users',       icon: Users,         label: 'Manage Users',  desc: 'Create and manage accounts',          color: '#8b5cf6' },
  { to: '/students',    icon: GraduationCap, label: 'Students',      desc: 'View all enrolled student profiles',  color: '#3b82f6' },
  { to: '/assignments', icon: UserCheck,     label: 'Assignments',   desc: 'Assign mentors to students',          color: '#10b981' },
  { to: '/courses',     icon: BookOpen,      label: 'Courses',       desc: 'Manage course catalog',               color: '#f59e0b' },
  { to: '/uploads',     icon: Upload,        label: 'Data Upload',   desc: 'Bulk import via CSV / XLSX',          color: '#06b6d4' },
]

export default function AdminDashboard() {
  const user = authService.getUser()
  const { data, loading, error } = useDashboard()

  const kpis = [
    { label: 'Total Students',      value: data?.total_students  ?? '—', color: '#3b82f6' },
    { label: 'High Risk Students',  value: data?.high_risk       ?? '—', color: '#f43f5e' },
    { label: 'Active Interventions',value: data?.active_interventions ?? '—', color: '#f59e0b' },
    { label: 'Total Users',         value: data?.total_users     ?? '—', color: '#8b5cf6' },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Welcome back, <span className="gradient-text">{user?.name}</span></h1>
          <p className="page-subtitle">System administration overview</p>
        </div>
        <div className="risk-badge" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>
          <Shield size={12} /> Admin
        </div>
      </div>

      {error && <ErrorBanner message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {loading ? <Spinner text="Loading stats…" /> : kpis.map(({ label, value, color }) => (
          <div key={label} className="kpi-card animate-fade-in-delay">
            <span className="kpi-label">{label}</span>
            <span className="kpi-value" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Management Modules
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {TILES.map(({ to, icon: Icon, label, desc, color }, i) => (
          <Link key={to} to={to} className="card-glow animate-fade-in"
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', animationDelay: `${i * 0.05}s` }}>
            <div style={{ width: 40, height: 40, borderRadius: '0.625rem', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{label}</p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
