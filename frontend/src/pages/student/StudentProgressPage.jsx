/**
 * StudentProgressPage — week-by-week academic trend and improvement tracker.
 * Pulls risk history + academic records for the logged-in student.
 */
import authService from '../../services/auth'
import { useFetch } from '../../services/hooks'
import { Spinner, ErrorBanner, ProgressBar } from '../../components/ui'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function StudentProgressPage() {
  const user = authService.getUser()
  const sid = user?.student_id

  const { data: history, loading: hLoad, error: hErr } = useFetch(sid ? `/risk/${sid}/history` : null)
  const { data: academic, loading: aLoad, error: aErr } = useFetch(sid ? `/students/${sid}` : null)

  const riskData = (history || []).map((h, i) => ({
    week: `W${h.week || i + 1}`,
    risk: Math.round(h.risk_probability * 100),
    level: h.risk_level,
  }))

  // Trend direction
  const trend = riskData.length >= 2
    ? riskData[riskData.length - 1].risk - riskData[riskData.length - 2].risk
    : 0

  const TrendIcon = trend > 2 ? TrendingUp : trend < -2 ? TrendingDown : Minus
  const trendColor = trend > 2 ? '#f43f5e' : trend < -2 ? '#10b981' : '#6b7280'

  if (hLoad || aLoad) return <Spinner text="Loading progress data…" />

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Progress Tracker</h1>
        <p className="page-subtitle">Your academic trend and risk evolution over time</p>
      </div>

      {(hErr || aErr) && <ErrorBanner message={hErr || aErr} />}

      {riskData.length < 2 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <TrendingUp size={40} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: 600, margin: '0 0 0.25rem' }}>Not enough data yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            At least 2 risk assessments are needed to show your trend.<br />
            Ask your faculty to update your academic record each week.
          </p>
        </div>
      ) : (
        <>
          {/* Trend summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="kpi-card">
              <span className="kpi-label">Latest Risk</span>
              <span className="kpi-value" style={{ color: '#3b82f6' }}>{riskData[riskData.length - 1]?.risk}%</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Trend</span>
              <span className="kpi-value" style={{ color: trendColor, display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <TrendIcon size={20} /> {Math.abs(trend)}%
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Assessments</span>
              <span className="kpi-value">{riskData.length}</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-label">Weeks Tracked</span>
              <span className="kpi-value">{riskData.length}</span>
            </div>
          </div>

          {/* Risk trend chart */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Risk Probability Over Time
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit="%" />
                <Tooltip
                  formatter={v => [`${v}%`, 'Risk']}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'HIGH threshold', position: 'right', fill: '#f43f5e', fontSize: 10 }} />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'MEDIUM threshold', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} name="Risk %" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Risk level distribution */}
          <div className="card">
            <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Risk Level Distribution
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['LOW', 'MEDIUM', 'HIGH'].map(lvl => {
                const count = riskData.filter(d => d.level === lvl).length
                const pct   = Math.round((count / riskData.length) * 100)
                const color = lvl === 'HIGH' ? '#f43f5e' : lvl === 'MEDIUM' ? '#f59e0b' : '#10b981'
                return (
                  <div key={lvl} style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{lvl}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{count} wk{count !== 1 ? 's' : ''}</span>
                    </div>
                    <ProgressBar value={pct} color={color} />
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
