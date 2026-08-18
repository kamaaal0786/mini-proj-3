/**
 * MentorStudentDetailPage — full profile view for mentors.
 * Reuses the same data as faculty StudentDetailPage, just with mentor auth.
 */
import { useParams, Link } from 'react-router-dom'
import { useStudent, useCurrentRisk, useRiskHistory, useExplanation, useCredits, useInterventions } from '../../services/hooks'
import { RiskBadge, Spinner, ErrorBanner, ProgressBar, IVStatusBadge } from '../../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ArrowLeft, Brain, TrendingUp, CreditCard, Target, MessageSquare } from 'lucide-react'
import api from '../../services/api'
import { useState } from 'react'

const IMPACT_COLOR = { high: '#f43f5e', medium: '#f59e0b', low: '#10b981' }

export default function MentorStudentDetailPage() {
  const { id } = useParams()
  const sid = Number(id)

  const { data: student, loading: sLoad, error: sErr } = useStudent(sid)
  const { data: risk,    loading: rLoad }               = useCurrentRisk(sid)
  const { data: history }                               = useRiskHistory(sid)
  const { data: explain }                               = useExplanation(sid)
  const { data: credits }                               = useCredits(sid)
  const { data: ivList,  refetch: refetchIV }           = useInterventions(sid)

  const [note, setNote] = useState('')
  const [updatingIV, setUpdatingIV] = useState(null)

  const updateIV = async (ivId, status) => {
    setUpdatingIV(ivId)
    try {
      await api.patch(`/interventions/${ivId}`, { status, note: note || undefined })
      setNote('')
      refetchIV()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
    finally { setUpdatingIV(null) }
  }

  const chartData = (history || []).map((h, i) => ({ week: `W${h.week || i + 1}`, risk: Math.round(h.risk_probability * 100) }))

  if (sLoad) return <Spinner text="Loading student…" />
  if (sErr)  return <ErrorBanner message={sErr} />

  return (
    <div className="animate-fade-in">
      <Link to="/at-risk" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{student?.name}</h1>
          <p className="page-subtitle">{student?.roll_no} · {student?.program} · Semester {student?.semester}</p>
        </div>
        <RiskBadge level={risk?.risk_level} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Risk Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <TrendingUp size={14} /> Risk Profile
          </h3>
          {rLoad ? <Spinner /> : risk ? (
            <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '3rem', fontWeight: 800, color: risk.risk_level === 'HIGH' ? '#f43f5e' : risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>
                {Math.round(risk.risk_probability * 100)}%
              </p>
              <RiskBadge level={risk.risk_level} />
              {chartData.length > 1 && (
                <div style={{ marginTop: '1rem' }}>
                  <ResponsiveContainer width="100%" height={110}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
                      <Tooltip formatter={v => `${v}%`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No risk score yet.</p>}
        </div>

        {/* SHAP */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Brain size={14} /> Risk Factors
          </h3>
          {explain?.top_factors?.length ? explain.top_factors.map(f => (
            <div key={f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{f.feature.replace(/_/g, ' ')}</span>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: `${IMPACT_COLOR[f.impact]}18`, color: IMPACT_COLOR[f.impact], fontWeight: 600 }}>{f.impact.toUpperCase()}</span>
                <span style={{ fontSize: '0.7rem', color: f.direction === 'increases_risk' ? '#f43f5e' : '#10b981' }}>{f.direction === 'increases_risk' ? '↑' : '↓'}</span>
              </div>
            </div>
          )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No explanation data.</p>}
        </div>

        {/* Credits */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <CreditCard size={14} /> Credits
          </h3>
          {credits && credits.status !== 'NO_DATA' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <ProgressBar value={credits.completion_pct}
                color={credits.status === 'ON_TRACK' ? '#10b981' : credits.status === 'AT_RISK' ? '#f59e0b' : '#f43f5e'}
                label={`${credits.completion_pct}% complete`} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {[['Earned', credits.earned, '#10b981'], ['Deficit', credits.deficit, '#f43f5e']].map(([lbl, val, col]) => (
                  <div key={lbl} className="kpi-card" style={{ padding: '0.5rem' }}>
                    <span className="kpi-label" style={{ fontSize: '0.7rem' }}>{lbl}</span>
                    <span className="kpi-value" style={{ fontSize: '1.25rem', color: col }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No credit data.</p>}
        </div>

        {/* Interventions with status update */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Target size={14} /> Interventions
          </h3>
          {(ivList || []).length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No interventions assigned yet.</p>
            : (ivList || []).map(iv => (
              <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                <IVStatusBadge status={iv.status} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{iv.type?.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 220 }}>{iv.reason}</span>
                <select value={iv.status} disabled={updatingIV === iv.id}
                  onChange={e => updateIV(iv.id, e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '0.3rem 0.55rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  {['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FOLLOW_UP'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            ))}
        </div>

      </div>
    </div>
  )
}
