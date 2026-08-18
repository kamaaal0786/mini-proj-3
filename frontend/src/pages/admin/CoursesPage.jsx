/**
 * CoursesPage — Admin course catalog with faculty assignment.
 * API: GET /api/courses, POST /api/courses, POST /api/courses/{id}/assign-faculty
 */
import { useState } from 'react'
import { useFetch } from '../../services/hooks'
import { Spinner, ErrorBanner } from '../../components/ui'
import api from '../../services/api'
import { Plus, BookOpen } from 'lucide-react'

export default function CoursesPage() {
  const { data: courses, loading, error, refetch } = useFetch('/courses')
  const { data: faculty } = useFetch('/users?role=faculty')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', credits: 3, semester: 1 })

  const createCourse = async (e) => {
    e.preventDefault()
    setSaving(true); setFormErr(null)
    try {
      await api.post('/courses', { ...form, credits: Number(form.credits), semester: Number(form.semester) })
      setShowForm(false)
      setForm({ name: '', code: '', credits: 3, semester: 1 })
      refetch()
    } catch (e) { setFormErr(e.response?.data?.detail || e.message) }
    finally { setSaving(false) }
  }

  const assignFaculty = async (courseId, facultyId) => {
    if (!facultyId) return
    try {
      await api.post(`/courses/${courseId}/assign-faculty`, { faculty_id: Number(facultyId) })
      refetch()
    } catch (e) { alert(e.response?.data?.detail || e.message) }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">Manage course catalog and assign faculty</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}><Plus size={15} /> New Course</button>
      </div>

      {error && <ErrorBanner message={error} />}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Add Course</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem' }}>✕</button>
            </div>
            {formErr && <ErrorBanner message={formErr} />}
            <form onSubmit={createCourse} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[['Course Name', 'name', 'text'], ['Course Code', 'code', 'text']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>{label}</label>
                  <input type={type} required value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Credits</label>
                  <input type="number" min="1" max="6" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Semester</label>
                  <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
                {saving ? 'Saving…' : 'Create Course'}
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {(courses || []).map(c => (
            <div key={c.course_id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.5rem', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BookOpen size={16} color="#3b82f6" />
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.name}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.code} · {c.credits} credits · Sem {c.semester}</p>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>Assigned Faculty</label>
                <select
                  defaultValue={c.faculty_id || ''}
                  onChange={e => assignFaculty(c.course_id, e.target.value)}
                  style={{ width: '100%', padding: '0.45rem 0.65rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                  <option value="">— Unassigned —</option>
                  {(faculty || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
