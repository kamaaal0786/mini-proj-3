/**
 * UploadsPage — drag-and-drop CSV/XLSX importer with row-level error table.
 */
import { useState, useRef } from 'react'
import { Upload, CheckCircle, AlertTriangle, FileText, X } from 'lucide-react'
import api from '../../services/api'

export default function UploadsPage() {
  const [file, setFile]         = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState(null)
  const inputRef = useRef()

  const accept = (f) => {
    if (!f) return
    if (!f.name.match(/\.(csv|xlsx)$/i)) { setError('Only .csv and .xlsx files are accepted.'); return }
    setFile(f); setResult(null); setError(null)
  }

  const onDrop = (e) => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]) }
  const onFile = (e) => accept(e.target.files[0])

  const upload = async () => {
    if (!file) return
    setLoading(true); setError(null); setResult(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/academic/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Data Upload</h1>
        <p className="page-subtitle">Import academic records in bulk. Valid rows trigger automatic risk inference.</p>
      </div>

      {/* Template hint */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Required columns:</strong>{' '}
          <code style={{ color: '#3b82f6' }}>roll_no, attendance, marks, gpa, assignment_completion, failed_subjects, earned_credits, expected_credits, required_credits</code>
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? '#3b82f6' : 'var(--border)'}`,
          borderRadius: '0.75rem', padding: '3rem 2rem',
          textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'rgba(59,130,246,0.05)' : 'var(--bg-card)',
          transition: 'all 0.2s', marginBottom: '1.5rem',
        }}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx" style={{ display: 'none' }} onChange={onFile} />
        <Upload size={40} color={dragging ? '#3b82f6' : 'var(--text-muted)'} style={{ margin: '0 auto 1rem', display: 'block' }} />
        {file ? (
          <div>
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}><FileText size={14} style={{ verticalAlign: 'middle' }} /> {file.name}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div>
            <p style={{ margin: '0 0 0.25rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Drag & drop your CSV or XLSX file here</p>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>or click to browse</p>
          </div>
        )}
      </div>

      {file && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <button id="upload-btn" className="btn btn-primary" onClick={upload} disabled={loading} style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'Uploading…' : <><Upload size={15} /> Import File</>}
          </button>
          <button className="btn" onClick={() => { setFile(null); setResult(null); setError(null) }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>⚠ {error}</div>}

      {result && (
        <div className="card">
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>{result.rows_imported}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Imported</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: result.rows_failed > 0 ? '#f43f5e' : 'var(--text-muted)' }}>{result.rows_failed}</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Failed</p>
            </div>
          </div>

          {result.errors?.length > 0 && (
            <>
              <p style={{ fontWeight: 600, color: '#f43f5e', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Row-level errors:</p>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {result.errors.map((err, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.8125rem' }}>
                    <span style={{ color: '#f43f5e', fontWeight: 600 }}>Row {err.row}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{err.roll_no && `[${err.roll_no}]`}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{err.errors?.join(', ')}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
