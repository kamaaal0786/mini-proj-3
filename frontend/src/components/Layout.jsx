/**
 * Role-aware sidebar + topbar layout shell.
 * Sidebar links rendered based on current user role.
 * Wraps all protected dashboard pages.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import authService from '../services/auth'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Upload,
  UserCheck, AlertTriangle, ClipboardList, TrendingUp,
  CreditCard, CheckSquare, BarChart2, LogOut, Settings,
  Shield, Brain,
} from 'lucide-react'

const NAV_CONFIG = {
  admin: {
    label: 'Administration',
    color: '#8b5cf6',
    items: [
      { to: '/admin',          icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/users',          icon: Users,           label: 'Users' },
      { to: '/admin/students', icon: GraduationCap,   label: 'Students' },
      { to: '/assignments',    icon: UserCheck,       label: 'Assignments' },
      { to: '/courses',        icon: BookOpen,        label: 'Courses' },
      { to: '/uploads',        icon: Upload,          label: 'Data Upload' },
    ],
  },
  faculty: {
    label: 'Faculty Portal',
    color: '#06b6d4',
    items: [
      { to: '/faculty',       icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/students',      icon: GraduationCap,   label: 'My Students' },
      { to: '/interventions', icon: ClipboardList,   label: 'Interventions' },
      { to: '/uploads',       icon: Upload,          label: 'Upload Data' },
    ],
  },
  mentor: {
    label: 'Mentor Portal',
    color: '#10b981',
    items: [
      { to: '/mentor',               icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/at-risk',              icon: AlertTriangle,   label: 'At-Risk Students' },
      { to: '/students',             icon: GraduationCap,   label: 'All Students' },
      { to: '/mentor/interventions', icon: ClipboardList,   label: 'Interventions' },
    ],
  },
  student: {
    label: 'Student Portal',
    color: '#3b82f6',
    items: [
      { to: '/student',          icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/student/risk',     icon: TrendingUp,      label: 'Risk Profile' },
      { to: '/student/credits',  icon: CreditCard,      label: 'Credits' },
      { to: '/student/actions',  icon: CheckSquare,     label: 'Action Plan' },
      { to: '/student/progress', icon: BarChart2,       label: 'Progress' },
    ],
  },
}

const ROLE_ICONS = {
  admin: Shield,
  faculty: BookOpen,
  mentor: UserCheck,
  student: GraduationCap,
}

export default function Layout() {
  const navigate = useNavigate()
  const user = authService.getUser()
  const role = user?.role || 'student'
  const config = NAV_CONFIG[role] || NAV_CONFIG.student
  const RoleIcon = ROLE_ICONS[role] || GraduationCap

  function handleLogout() {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '0.5rem',
              background: `linear-gradient(135deg, ${config.color}22, ${config.color}44)`,
              border: `1px solid ${config.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brain size={18} color={config.color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                AcademiQ
              </p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Risk & Credit System
              </p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '0.75rem 1.25rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: `${config.color}12`,
            border: `1px solid ${config.color}30`,
            borderRadius: '0.5rem',
            padding: '0.5rem 0.75rem',
          }}>
            <RoleIcon size={14} color={config.color} />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: config.color }}>
                {user?.name || 'User'}
              </p>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {role}
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1 }}>
          <p className="sidebar-section-label">{config.label}</p>
          {config.items.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={['/admin', '/faculty', '/mentor', '/student'].includes(to)}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 0.5rem' }}>
          <button
            className="nav-item btn-danger"
            style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left' }}
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              AI-Based Credit & Dropout Evaluation System
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `linear-gradient(135deg, ${config.color}, ${config.color}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.75rem', fontWeight: 700, color: 'white',
            }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {user?.name}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
