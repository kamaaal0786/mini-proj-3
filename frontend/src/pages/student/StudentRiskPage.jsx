/**
 * StudentRiskPage — risk probability gauge + sparkline trend chart.
 */
import authService from '../../services/auth'
import { useCurrentRisk, useRiskHistory, useExplanation } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, ResponsiveContainer } from 'recharts'
import { Brain } from 'lucide-react'

const RISK_COLOR = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }
const IMPACT_COLOR = { high: '#f43f5e', medium: '#f59e0b', low: '#10b981' }

export default function StudentRiskPage() {
  const user = authService.getUser()
  const sid = user?.student_id

  const { data: risk,    loading: rLoad, error: rErr } = useCurrentRisk(sid)
  const { data: history }                               = useRiskHistory(sid)
  const { data: explain }                               = useExplanation(sid)

  const chartData = (history || []).map((h, i) => ({
    week: `W${h.week || i + 1}`,
    risk: Math.round(h.risk_probability * 100),
  }))

  const riskColor = RISK_COLOR[risk?.risk_level] || 'var(--text-muted)'

  if (rLoad) return <Spinner text="Loading risk data…" />

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Risk Profile</h1>
        <p className="page-subtitle">Your current dropout risk score and trend over time</p>
      </div>

      {rErr && <ErrorBanner message={rErr} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Current Risk */}
        <div className="card" style={{ textAlign: 'center', borderTop: `4px solid ${riskColor}` }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>CURRENT RISK LEVEL</p>
          {risk ? (
            <>
              <p style={{ margin: '0 0 0.25rem', fontSize: '4rem', fontWeight: 900, color: riskColor, lineHeight: 1 }}>
                {Math.round(risk.risk_probability * 100)}%
              </p>
              <p style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: 700, color: riskColor }}>
                {risk.risk_level}
              </p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Model: {risk.model_version}<br />
                Last updated: {risk.calculated_at ? new Date(risk.calculated_at).toLocaleString() : '—'}
              </p>
            </>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No risk score yet. Ask your faculty to upload academic data.</p>
          )}
        </div>

        {/* Trend chart */}
        <div className="card">
          <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>RISK TREND OVER TIME</p>
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} unit="%" />
                <Tooltip formatter={v => `${v}%`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'HIGH', position: 'right', fill: '#f43f5e', fontSize: 10 }} />
                <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'MED', position: 'right', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Not enough data for a trend. At least 2 risk snapshots needed.</p>
          )}
        </div>

        {/* SHAP explanation */}
        {explain?.top_factors?.length > 0 && (
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Brain size={13} /> TOP CONTRIBUTING FACTORS
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              {explain.top_factors.map(f => (
                <div key={f.feature} className="kpi-card" style={{ padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {f.feature.replace(/_/g, ' ')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.375rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem', borderRadius: 4,
                      background: `${IMPACT_COLOR[f.impact]}18`, color: IMPACT_COLOR[f.impact], fontWeight: 700 }}>
                      {f.impact.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: f.direction === 'increases_risk' ? '#f43f5e' : '#10b981' }}>
                      {f.direction === 'increases_risk' ? '↑ increases risk' : '↓ reduces risk'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {explain.method === 'shap' ? 'Explanations powered by SHAP (model-derived).' : 'Rule-based explanations (model not trained yet).'}
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
