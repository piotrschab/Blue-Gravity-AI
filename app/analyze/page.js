'use client'

import { useState, useEffect } from 'react'

const fmt = ms => {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`
  return `${(ms/60000).toFixed(1)} min`
}

const pct = (part, total) => total ? `${((part/total)*100).toFixed(0)}%` : '—'

const bar = (ms, totalMs, color) => {
  const w = totalMs ? Math.max(2, (ms/totalMs)*100) : 0
  return (
    <div style={{ height: 6, background: '#1e2535', borderRadius: 3, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 3, transition: 'width .4s' }} />
    </div>
  )
}

const COLORS = ['#60a5fa','#f59e0b','#34d399','#a78bfa','#f87171','#38bdf8']

export default function AnalyzePage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [sessionInput, setSessionInput] = useState('')
  const [rawOpen, setRawOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load(sid) {
    setLoading(true); setError(null)
    const url = `/api/analyze-session${sid ? `?sessionId=${sid}` : ''}`
    try {
      const res = await fetch(url)
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setData(d)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const s = { color: '#e2e8f0' }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height:100%; background:#0f1117; color:#e2e8f0; font-family:-apple-system,'Inter',sans-serif; }
        .page { max-width: 860px; margin: 0 auto; padding: 40px 24px 80px; }
        .back { font-size:13px; color:#60a5fa; text-decoration:none; display:inline-flex; align-items:center; gap:5px; margin-bottom:28px; }
        .back:hover { color:#93c5fd; }
        h1 { font-size:22px; font-weight:700; margin-bottom:4px; }
        .sub { font-size:13px; color:#475569; margin-bottom:28px; }
        .search-row { display:flex; gap:8px; margin-bottom:32px; }
        .sid-input { flex:1; background:#131929; border:1px solid #1e2535; border-radius:8px; padding:9px 14px; color:#e2e8f0; font-size:13px; outline:none; }
        .sid-input::placeholder { color:#334155; }
        .sid-input:focus { border-color:#2d4a7a; }
        .go-btn { padding:9px 18px; border-radius:8px; border:none; background:#1d4ed8; color:#fff; font-size:13px; cursor:pointer; }
        .go-btn:hover { background:#2563eb; }

        .section { margin-bottom:28px; }
        .section-title { font-size:11px; color:#475569; text-transform:uppercase; letter-spacing:.08em; font-family:'DM Mono',monospace; margin-bottom:12px; }
        .cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; }
        .card { background:#131929; border:1px solid #1e2535; border-radius:10px; padding:14px 16px; }
        .card-val { font-size:22px; font-weight:700; color:#e2e8f0; }
        .card-label { font-size:11px; color:#475569; margin-top:3px; }
        .card.warn { border-color:rgba(245,158,11,.3); background:rgba(245,158,11,.05); }
        .card.danger { border-color:rgba(248,113,113,.3); background:rgba(248,113,113,.05); }

        .thread-row { background:#131929; border:1px solid #1e2535; border-radius:10px; padding:14px 18px; margin-bottom:8px; }
        .thread-head { display:flex; align-items:center; gap:10px; margin-bottom:6px; }
        .thread-name { font-size:14px; font-weight:600; color:#e2e8f0; }
        .badge { font-size:9px; padding:2px 7px; border-radius:20px; font-family:'DM Mono',monospace; letter-spacing:.05em; }
        .thread-meta { font-size:11px; color:#475569; display:flex; gap:12px; margin-top:6px; flex-wrap:wrap; }
        .thread-tools { font-size:11px; color:#60a5fa; margin-top:6px; }

        .gap-row { display:flex; justify-content:space-between; align-items:center; padding:8px 14px; background:#131929; border:1px solid #1e2535; border-radius:7px; margin-bottom:5px; font-size:12px; }
        .gap-time { color:#f59e0b; font-weight:600; font-family:'DM Mono',monospace; }
        .gap-after { color:#475569; }

        .tool-row { display:flex; justify-content:space-between; align-items:center; padding:6px 14px; background:#131929; border:1px solid #1e2535; border-radius:7px; margin-bottom:4px; font-size:12px; }
        .tool-count { color:#60a5fa; font-family:'DM Mono',monospace; font-weight:600; }

        .event-types { display:flex; flex-wrap:wrap; gap:5px; }
        .ev-chip { padding:3px 9px; background:#0a0c14; border:1px solid #1e2535; border-radius:20px; font-size:10px; color:#64748b; font-family:'DM Mono',monospace; }

        pre { background:#0a0c14; border:1px solid #1e2535; border-radius:8px; padding:14px; font-size:11px; color:#94a3b8; overflow-x:auto; line-height:1.5; margin-top:8px; }
        .toggle-btn { font-size:11px; color:#60a5fa; background:none; border:none; cursor:pointer; padding:0; }
        .toggle-btn:hover { color:#93c5fd; }

        .bottleneck-box { border:1px solid rgba(248,113,113,.3); background:rgba(248,113,113,.05); border-radius:10px; padding:16px 18px; margin-bottom:20px; }
        .bottleneck-title { font-size:12px; font-weight:700; color:#f87171; margin-bottom:8px; display:flex; align-items:center; gap:6px; }
        .recommendation { background:#131929; border:1px solid #1e2535; border-radius:8px; padding:12px 14px; font-size:13px; color:#94a3b8; line-height:1.7; }
        .recommendation strong { color:#e2e8f0; }
      `}</style>

      <div className="page">
        <a className="back" href="/"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg> Back to chat</a>
        <h1>Session Analysis</h1>
        <p className="sub">Timing breakdown, bottlenecks and token estimates for your last agent session.</p>

        <div className="search-row">
          <input className="sid-input" placeholder="Paste session ID to analyse a specific session (leave blank for latest)" value={sessionInput} onChange={e => setSessionInput(e.target.value)} onKeyDown={e => e.key==='Enter' && load(sessionInput.trim() || undefined)} />
          <button className="go-btn" onClick={() => load(sessionInput.trim() || undefined)}>Analyse</button>
        </div>

        {loading && <div style={{ color:'#475569', fontSize:14 }}>Loading session data…</div>}
        {error   && <div style={{ color:'#f87171', fontSize:13, background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.2)', borderRadius:8, padding:'14px 16px' }}><strong>Error:</strong> {error}</div>}

        {data && !loading && (
          <>
            {/* ── Overview ── */}
            <div className="section">
              <div className="section-title">Overview</div>
              <div style={{ fontSize:11, color:'#334155', fontFamily:'DM Mono', marginBottom:10 }}>Session: {data.sessionId}</div>
              <div className="cards">
                <div className={`card ${data.totalDurationMin > 20 ? 'danger' : data.totalDurationMin > 10 ? 'warn' : ''}`}>
                  <div className="card-val">{fmt(data.totalDurationMs)}</div>
                  <div className="card-label">Total duration</div>
                </div>
                <div className="card">
                  <div className="card-val">{data.threads?.length ?? '—'}</div>
                  <div className="card-label">Agent threads</div>
                </div>
                <div className="card">
                  <div className="card-val">{data.totalEvents}</div>
                  <div className="card-label">Events</div>
                </div>
                <div className={`card ${data.estimatedTotalTokens > 100000 ? 'danger' : data.estimatedTotalTokens > 50000 ? 'warn' : ''}`}>
                  <div className="card-val">{data.estimatedTotalTokens?.toLocaleString() ?? '—'}</div>
                  <div className="card-label">Est. total tokens</div>
                </div>
                <div className="card">
                  <div className="card-val">{data.estimatedInputTokens?.toLocaleString() ?? '—'}</div>
                  <div className="card-label">Est. input tokens</div>
                </div>
                <div className="card">
                  <div className="card-val">{data.estimatedOutputTokens?.toLocaleString() ?? '—'}</div>
                  <div className="card-label">Est. output tokens</div>
                </div>
              </div>
            </div>

            {/* ── Bottleneck ── */}
            {data.bottleneck && (
              <div className="section">
                <div className="section-title">Bottleneck</div>
                <div className="bottleneck-box">
                  <div className="bottleneck-title">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Slowest agent: {data.bottleneck.agentName || data.bottleneck.threadId}
                  </div>
                  <div style={{ fontSize:13, color:'#94a3b8', lineHeight:1.7 }}>
                    Took <strong style={{ color:'#f87171' }}>{fmt(data.bottleneck.durationMs)}</strong> —{' '}
                    <strong style={{ color:'#e2e8f0' }}>{pct(data.bottleneck.durationMs, data.totalDurationMs)}</strong> of total session time.
                    {data.bottleneck.toolCalls?.length > 0 && (
                      <> Called tools: <strong style={{ color:'#60a5fa' }}>{[...new Set(data.bottleneck.toolCalls)].join(', ')}</strong>.</>
                    )}
                  </div>
                </div>

                {data.topGaps?.length > 0 && (
                  <div className="recommendation">
                    <strong>Largest idle gaps</strong> — periods where nothing happened for &gt;5 s:<br />
                    {data.topGaps.map((g,i) => (
                      <span key={i} style={{ display:'block', marginTop:4 }}>
                        • <strong style={{ color:'#f59e0b' }}>{fmt(g.gapMs)}</strong> idle at <em>{g.afterType}</em> ({new Date(g.from).toLocaleTimeString()})
                      </span>
                    ))}
                    <br />
                    These gaps often indicate waiting on external tools (web search, file write) or context-window processing. Consider reducing the scope of research tasks or splitting into smaller sub-tasks.
                  </div>
                )}
              </div>
            )}

            {/* ── Per-thread breakdown ── */}
            {data.threads?.length > 0 && (
              <div className="section">
                <div className="section-title">Agent threads</div>
                {data.threads.map((t, i) => (
                  <div className="thread-row" key={t.threadId}>
                    <div className="thread-head">
                      <span className="badge" style={{ background:`${COLORS[i%6]}22`, color:COLORS[i%6], border:`1px solid ${COLORS[i%6]}44` }}>
                        {t.agentName || `Thread ${i+1}`}
                      </span>
                      <span style={{ fontSize:13, color:'#60a5fa', fontFamily:'DM Mono' }}>{fmt(t.durationMs)}</span>
                      <span style={{ fontSize:11, color:'#475569' }}>({pct(t.durationMs, data.totalDurationMs)} of total)</span>
                    </div>
                    {bar(t.durationMs, data.totalDurationMs, COLORS[i%6])}
                    <div className="thread-meta">
                      {t.messages.length > 0 && <span>{t.messages.length} message block(s)</span>}
                      {t.toolCalls.length > 0 && <span>{t.toolCalls.length} tool call(s)</span>}
                    </div>
                    {t.toolCalls.length > 0 && (
                      <div className="thread-tools">Tools: {[...new Set(t.toolCalls)].join(', ')}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ── Tool calls ── */}
            {Object.keys(data.toolCalls || {}).length > 0 && (
              <div className="section">
                <div className="section-title">Tool calls</div>
                {Object.entries(data.toolCalls).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
                  <div className="tool-row" key={name}>
                    <span>{name}</span>
                    <span className="tool-count">×{count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Event types ── */}
            <div className="section">
              <div className="section-title">Event types seen</div>
              <div className="event-types">
                {data.rawEventTypes?.map(t => <span key={t} className="ev-chip">{t}</span>)}
              </div>
            </div>

            {/* ── Raw sample ── */}
            <div className="section">
              <div className="section-title" style={{ display:'flex', alignItems:'center', gap:10 }}>
                First 5 events (shape inspection)
                <button className="toggle-btn" onClick={() => setRawOpen(o => !o)}>{rawOpen ? 'hide' : 'show'}</button>
              </div>
              {rawOpen && <pre>{JSON.stringify(data.events, null, 2)}</pre>}
            </div>
          </>
        )}
      </div>
    </>
  )
}
