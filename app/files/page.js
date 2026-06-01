'use client'

import { useState, useEffect } from 'react'

function fileTypeLabel(mediaType) {
  if (!mediaType) return 'FILE'
  if (mediaType.includes('word') || mediaType.includes('docx')) return 'DOCX'
  if (mediaType.includes('pdf')) return 'PDF'
  if (mediaType.includes('sheet') || mediaType.includes('xlsx') || mediaType.includes('excel')) return 'XLSX'
  if (mediaType.includes('csv')) return 'CSV'
  if (mediaType.includes('json')) return 'JSON'
  if (mediaType.includes('text')) return 'TXT'
  if (mediaType.includes('image')) return 'IMG'
  return mediaType.split('/').pop()?.toUpperCase().slice(0, 6) || 'FILE'
}

function fileTypeColor(mediaType) {
  if (!mediaType) return { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
  if (mediaType.includes('word') || mediaType.includes('docx')) return { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
  if (mediaType.includes('pdf')) return { bg: 'rgba(248,113,113,0.12)', color: '#f87171' }
  if (mediaType.includes('sheet') || mediaType.includes('xlsx')) return { bg: 'rgba(52,211,153,0.12)', color: '#34d399' }
  if (mediaType.includes('image')) return { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa' }
  return { bg: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
}

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(typeof ts === 'number' ? ts * 1000 : ts)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function FilesPage() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(null)

  useEffect(() => { loadFiles() }, [])

  async function loadFiles() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/files')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFiles(data.files || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadFile(file) {
    setDownloading(file.id)
    try {
      const res = await fetch(`/api/download/${file.id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.filename || file.name || `file_${file.id}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(`Download failed: ${e.message}`)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0f1117; color: #e2e8f0; font-family: -apple-system, 'Inter', sans-serif; }
        .page { max-width: 900px; margin: 0 auto; padding: 48px 24px; }
        .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
        .back-link { font-size: 13px; color: #60a5fa; text-decoration: none; display: flex; align-items: center; gap: 6px; transition: color .15s; }
        .back-link:hover { color: #93c5fd; }
        .title { font-size: 22px; font-weight: 700; color: #e2e8f0; }
        .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
        .reload-btn { padding: 7px 14px; border-radius: 7px; border: 1px solid #1e2535; background: transparent; color: #94a3b8; font-size: 12px; cursor: pointer; transition: all .15s; }
        .reload-btn:hover { background: #131929; color: #e2e8f0; }

        .loading { padding: 60px 0; text-align: center; color: #475569; font-size: 14px; }
        .error-box { padding: 20px; background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); border-radius: 10px; color: #f87171; font-size: 13px; }
        .empty { padding: 60px 0; text-align: center; color: #475569; font-size: 14px; }

        .files-grid { display: flex; flex-direction: column; gap: 8px; }
        .file-card { display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: #131929; border: 1px solid #1e2535; border-radius: 10px; transition: border-color .15s; }
        .file-card:hover { border-color: #2d4a7a; }
        .file-type-badge { width: 44px; height: 44px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; letter-spacing: .06em; font-family: 'DM Mono', monospace; flex-shrink: 0; }
        .file-info { flex: 1; min-width: 0; }
        .file-name { font-size: 14px; font-weight: 500; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
        .file-meta { font-size: 11px; color: #475569; display: flex; gap: 12px; align-items: center; }
        .file-meta span { display: flex; align-items: center; gap: 4px; }
        .dl-btn { padding: 7px 16px; border-radius: 7px; border: 1px solid #2d4a7a; background: transparent; color: #60a5fa; font-size: 12px; cursor: pointer; transition: all .15s; display: flex; align-items: center; gap: 6px; flex-shrink: 0; white-space: nowrap; }
        .dl-btn:hover:not(:disabled) { background: rgba(59,130,246,.1); border-color: #3b82f6; }
        .dl-btn:disabled { opacity: .5; cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin .8s linear infinite; display: inline-block; }
      `}</style>

      <div className="page">
        <div className="header">
          <div>
            <a className="back-link" href="/">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to chat
            </a>
            <div className="title" style={{ marginTop: 12 }}>Agent Files</div>
            <div className="subtitle">All files generated by your agents — stored in Anthropic Files API</div>
          </div>
          <button className="reload-btn" onClick={loadFiles}>↺ Refresh</button>
        </div>

        {loading && <div className="loading">Loading files…</div>}

        {error && (
          <div className="error-box">
            <strong>Error:</strong> {error}
            <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
              Make sure ANTHROPIC_API_KEY is set in your Vercel environment variables.
            </div>
          </div>
        )}

        {!loading && !error && files.length === 0 && (
          <div className="empty">No files found in your Anthropic account yet.</div>
        )}

        {!loading && !error && files.length > 0 && (
          <>
            <div style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>
              {files.length} file{files.length !== 1 ? 's' : ''} found
            </div>
            <div className="files-grid">
              {files.map(file => {
                const c = fileTypeColor(file.media_type || file.mime_type)
                const label = fileTypeLabel(file.media_type || file.mime_type)
                const isDownloading = downloading === file.id
                return (
                  <div key={file.id} className="file-card">
                    <div className="file-type-badge" style={{ background: c.bg, color: c.color }}>
                      {label}
                    </div>
                    <div className="file-info">
                      <div className="file-name">{file.filename || file.name || file.id}</div>
                      <div className="file-meta">
                        <span>{formatSize(file.size)}</span>
                        <span>·</span>
                        <span>{formatDate(file.created_at)}</span>
                        <span>·</span>
                        <span style={{ fontFamily: 'DM Mono', fontSize: 10, color: '#334155' }}>{file.id}</span>
                      </div>
                    </div>
                    <button className="dl-btn" onClick={() => downloadFile(file)} disabled={isDownloading}>
                      {isDownloading ? (
                        <><span className="spin">↻</span> Downloading…</>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
