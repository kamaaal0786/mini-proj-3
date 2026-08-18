/**
 * StudentDetailPage — full profile used by faculty (/students/:id) and mentor (/mentor/students/:id).
 * Shows: risk gauge, top SHAP factors, credit bar, intervention list.
 */
import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStudent, useCurrentRisk, useRiskHistory, useExplanation, useCredits, useInterventions } from '../../services/hooks'
import { RiskBadge, Spinner, ErrorBanner, ProgressBar, IVStatusBadge } from '../../components/ui'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ArrowLeft, Brain, TrendingUp, CreditCard, Target, Zap, RefreshCw } from 'lucide-react'
import api from '../../services/api'

const IMPACT_COLOR = { high: '#f43f5e', medium: '#f59e0b', low: '#10b981' }

export default function StudentDetailPage() {
  const { id } = useParams()
  const sid = Number(id)

  const { data: student, loading: sLoad, error: sErr }     = useStudent(sid)
  const { data: risk,    loading: rLoad, refetch: refetchRisk } = useCurrentRisk(sid)
  const { data: history, refetch: refetchHistory }          = useRiskHistory(sid)
  const { data: explain, refetch: refetchExplain }          = useExplanation(sid)
  const { data: credits }                                   = useCredits(sid)
  const { data: ivList }                                    = useInterventions(sid)

  const [inferring, setInferring] = useState(false)
  const [inferResult, setInferResult] = useState(null)
  const [inferErr, setInferErr]   = useState(null)

  const runInference = async () => {
    setInferring(true); setInferErr(null); setInferResult(null)
    try {
      const res = await api.post(`/risk/${sid}/predict`)
      setInferResult(res.data)
      refetchRisk(); refetchHistory(); refetchExplain()
    } catch (e) { setInferErr(e.response?.data?.detail || e.message) }
    finally { setInferring(false) }
  }

  if (sLoad) return <Spinner text="Loading student…" />
  if (sErr)  return <ErrorBanner message={sErr} />

  const chartData = (history || []).map((h, i) => ({ week: `W${h.week || i + 1}`, risk: Math.round(h.risk_probability * 100) }))

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link to={-1} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
        <ArrowLeft size={14} /> Back
      </Link>

      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{student?.name}</h1>
          <p className="page-subtitle">{student?.roll_no} · {student?.program} · Semester {student?.semester}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <RiskBadge level={risk?.risk_level} />
          <button onClick={runInference} disabled={inferring} className="btn btn-primary" style={{ fontSize: '0.8125rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            {inferring ? <><RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> Running…</> : <><Zap size={13} /> Run Inference</>}
          </button>
          <Link to={`/students/${sid}/academic`} className="btn" style={{ fontSize: '0.8125rem', textDecoration: 'none', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
            ✏ Update Data
          </Link>
        </div>
      </div>

      {inferErr && <ErrorBanner message={inferErr} />}
      {inferResult && (() => {
        const RISK_C = { HIGH: '#f43f5e', MEDIUM: '#f59e0b', LOW: '#10b981' }
        const rc = RISK_C[inferResult.risk_level] || '#6b7280'
        return (
          <div className="card" style={{ marginBottom: '1rem', borderLeft: `3px solid ${rc}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: inferResult.intervention_note ? '0.6rem' : 0 }}>
              <Zap size={18} color="#7c3aed" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ margin: '0 0 0.2rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Inference complete</p>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Risk: <strong style={{ color: rc }}>{inferResult.risk_level} ({Math.round(inferResult.risk_probability * 100)}%)</strong>
                  &nbsp;· Charts updated below
                </p>
              </div>
            </div>
            {inferResult.intervention_note && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', border: '1px solid rgba(16,185,129,0.2)' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>✅</span>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#10b981', fontWeight: 500, lineHeight: 1.5 }}>
                  {inferResult.intervention_note}
                </p>
              </div>
            )}
          </div>
        )
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>

        {/* Risk Gauge */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <TrendingUp size={14} /> Risk Profile
          </h3>
          {rLoad ? <Spinner /> : risk ? (
            <>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: risk.risk_level === 'HIGH' ? '#f43f5e' : risk.risk_level === 'MEDIUM' ? '#f59e0b' : '#10b981' }}>
                  {Math.round(risk.risk_probability * 100)}%
                </p>
                <RiskBadge level={risk.risk_level} />
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Model: {risk.model_version}
                </p>
              </div>
              {chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="%" />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" />
                    <ReferenceLine y={40} stroke="#f59e0b" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="risk" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No risk score yet. Run inference first.</p>}
        </div>

        {/* SHAP Factors */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Brain size={14} /> Top Risk Factors
          </h3>
          {explain?.top_factors?.length ? explain.top_factors.map((f) => (
            <div key={f.feature} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.625rem' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {f.feature.replace(/_/g, ' ')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: 4, background: `${IMPACT_COLOR[f.impact]}18`, color: IMPACT_COLOR[f.impact], fontWeight: 600 }}>
                  {f.impact.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.7rem', color: f.direction === 'increases_risk' ? '#f43f5e' : '#10b981' }}>
                  {f.direction === 'increases_risk' ? '↑' : '↓'}
                </span>
              </div>
            </div>
          )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Run inference to see factors.</p>}
          {explain?.method && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Method: {explain.method === 'shap' ? 'SHAP (model-derived)' : 'Rule-based fallback'}
            </p>
          )}
        </div>

        {/* Credits */}
        <div className="card">
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <CreditCard size={14} /> Credit Progress
          </h3>
          {credits && credits.status !== 'NO_DATA' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ProgressBar value={credits.completion_pct} label={`Completion ${credits.completion_pct}%`}
                color={credits.status === 'ON_TRACK' ? '#10b981' : credits.status === 'AT_RISK' ? '#f59e0b' : '#f43f5e'} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[['Earned', credits.earned, '#10b981'], ['Expected', credits.expected, '#3b82f6'],
                  ['Required', credits.required, '#8b5cf6'], ['Deficit', credits.deficit, '#f43f5e']].map(([lbl, val, col]) => (
                  <div key={lbl} className="kpi-card" style={{ padding: '0.625rem' }}>
                    <span className="kpi-label" style={{ fontSize: '0.7rem' }}>{lbl}</span>
                    <span className="kpi-value" style={{ fontSize: '1.25rem', color: col }}>{val}</span>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.75rem', borderRadius: '999px',
                  background: credits.status === 'ON_TRACK' ? 'rgba(16,185,129,0.1)' : credits.status === 'AT_RISK' ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                  color: credits.status === 'ON_TRACK' ? '#10b981' : credits.status === 'AT_RISK' ? '#f59e0b' : '#f43f5e',
                  fontWeight: 700 }}>
                  {credits.status?.replace('_', ' ')}
                </span>
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No credit data. Upload academic records first.</p>}
        </div>

        {/* Interventions */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <Target size={14} /> Interventions
          </h3>
          {ivList?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {ivList.map((iv) => (
                <div key={iv.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.625rem 0', borderBottom: '1px solid var(--border)' }}>
                  <IVStatusBadge status={iv.status} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>
                    {iv.type?.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: 300 }}>{iv.reason}</span>
                  {iv.due_date && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Due: {iv.due_date}</span>}
                </div>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No interventions yet. Upload data to trigger automatic rules.</p>}
        </div>

      </div>
    </div>
  )
}
