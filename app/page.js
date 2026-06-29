'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDur(ms) {
  if (!ms || ms < 0) return null
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

// ─── Agent colour palette ────────────────────────────────────────────────────
const PALETTE = [
  { dot: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', name: 'Research' },
  { dot: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', name: 'QA' },
  { dot: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.25)', name: 'Synthesis' },
  { dot: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', name: 'Agent' },
]

// ─── Markdown renderer ───────────────────────────────────────────────────────
let _key = 0
const k = () => `md-${_key++}`

function inline(str) {
  const parts = []
  const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)|\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g
  let last = 0, m
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index))
    if (m[1])      parts.push(<strong key={k()}>{m[2]}</strong>)
    else if (m[3]) parts.push(<em key={k()}>{m[4]}</em>)
    else if (m[5]) parts.push(<code key={k()} className="inline-code">{m[6]}</code>)
    else if (m[7]) parts.push(<a key={k()} href={m[8]} target="_blank" rel="noopener noreferrer" className="md-link">{m[7]}</a>)
    last = m.index + m[0].length
  }
  if (last < str.length) parts.push(str.slice(last))
  return parts
}

function Markdown({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (l.startsWith('```')) {
      const lang = l.slice(3).trim()
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++ }
      out.push(
        <div key={k()} className="code-block">
          {lang && <div className="code-lang">{lang}</div>}
          <pre><code>{code.join('\n')}</code></pre>
        </div>
      )
      i++; continue
    }
    if (l.startsWith('# '))  { out.push(<h1 key={k()} className="md-h1">{inline(l.slice(2))}</h1>); i++; continue }
    if (l.startsWith('## ')) { out.push(<h2 key={k()} className="md-h2">{inline(l.slice(3))}</h2>); i++; continue }
    if (l.startsWith('### ')){ out.push(<h3 key={k()} className="md-h3">{inline(l.slice(4))}</h3>); i++; continue }
    if (l.match(/^[-*] /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*] /)) { items.push(<li key={k()}>{inline(lines[i].slice(2))}</li>); i++ }
      out.push(<ul key={k()} className="md-ul">{items}</ul>); continue
    }
    if (l.match(/^\d+\. /)) {
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\. /)) { items.push(<li key={k()}>{inline(lines[i].replace(/^\d+\. /, ''))}</li>); i++ }
      out.push(<ol key={k()} className="md-ol">{items}</ol>); continue
    }
    if (l.match(/^---+$/)) { out.push(<hr key={k()} className="md-hr" />); i++; continue }
    if (l.trim() === '')   { out.push(<div key={k()} className="md-gap" />); i++; continue }
    out.push(<p key={k()} className="md-p">{inline(l)}</p>); i++
  }
  return <div className="markdown">{out}</div>
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function AgentPill({ idx, name }) {
  const p = PALETTE[idx % 4]
  return (
    <span className="agent-pill" style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.dot }}>
      <span className="agent-dot" style={{ background: p.dot }} />
      {name || p.name}
    </span>
  )
}

function Dots({ color = '#60a5fa' }) {
  return (
    <span className="dots">
      {[0,1,2].map(i => <span key={i} className="dot" style={{ background: color, animationDelay: `${i * 0.18}s` }} />)}
    </span>
  )
}

function PipelineBar({ active, completed, all, running, elapsed }) {
  if (!running) return null
  const now = Date.now()
  return (
    <div className="pipeline-bar">
      <div className="pipeline-inner">
        <div className="pipeline-left">
          {active.length === 0 && completed.length === 0 && (
            <><Dots /><span className="pipeline-label">Orchestrator analyzes…</span></>
          )}
          {active.map(a => {
            const idx = all.findIndex(x => x.threadId === a.threadId)
            const agentElapsed = a.startedAt ? fmtDur(now - new Date(a.startedAt).getTime()) : null
            return (
              <span key={a.threadId} className="pipeline-agent">
                <AgentPill idx={idx} name={a.agentName} />
                <Dots color={PALETTE[idx % 4].dot} />
                {agentElapsed && <span className="agent-timer">{agentElapsed}</span>}
              </span>
            )
          })}
          {completed.map(tid => {
            const a = all.find(x => x.threadId === tid)
            if (!a) return null
            const idx = all.findIndex(x => x.threadId === tid)
            const dur = fmtDur(a.durationMs)
            return (
              <span key={tid} className="pipeline-agent done">
                <span className="check">✓</span>
                <AgentPill idx={idx} name={a.agentName} />
                {dur && <span className="agent-timer done-timer">{dur}</span>}
              </span>
            )
          })}
        </div>
        {elapsed > 0 && <span className="pipeline-elapsed">Total: {elapsed}s</span>}
      </div>
    </div>
  )
}

function UserMsg({ content, time, attachments }) {
  return (
    <div className="msg-row user-row">
      <div className="user-bubble">
        {attachments?.length > 0 && (
          <div className="user-attachments">
            {attachments.map(f => (
              <a
                key={f.fileId}
                className="user-attachment"
                href={`/api/download/${f.fileId}`}
                download={f.filename || 'download'}
                title="Click to download"
              >
                <span className="user-attachment-icon">
                  {fileIcon(f.contentType)}
                </span>
                <span className="user-attachment-name">{f.filename || 'Attachment'}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            ))}
          </div>
        )}
        <div className="bubble-text">{content}</div>
        {time && <div className="bubble-time">{time}</div>}
      </div>
    </div>
  )
}

function fileIcon(contentType) {
  if (contentType?.includes('word') || contentType?.includes('docx'))
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  if (contentType?.includes('pdf'))
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  if (contentType?.includes('sheet') || contentType?.includes('excel') || contentType?.includes('xlsx'))
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
}

function ErrorBanner({ error }) {
  const isBilling = error?.code?.includes('billing') || error?.message?.toLowerCase().includes('credit')
  return (
    <div className="error-banner">
      <div className="error-banner-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div>
        <div className="error-banner-title">{isBilling ? 'Billing limit reached' : 'Session error'}</div>
        <div className="error-banner-msg">{error?.message}</div>
        {isBilling && (
          <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="error-banner-link">
            Go to Anthropic billing →
          </a>
        )}
      </div>
    </div>
  )
}

function AssistantMsg({ content, agents, time, streaming, files, fatalError, statusLog, totalMs, elapsed }) {
  const now = Date.now()

  return (
    <div className="msg-row assistant-row">
      <div className="avatar">O</div>
      <div className="assistant-body">

        {/* During streaming: compact progress with live per-agent timers */}
        {streaming && (
          <div className="stream-status">
            {agents?.length > 0 ? (
              agents.map((a, i) => {
                const isCompleted = !!a.clientEndMs
                const liveMs = isCompleted
                  ? a.clientDurMs
                  : (a.clientStartMs ? now - a.clientStartMs : null)
                return (
                  <div key={a.threadId || i} className="stream-agent-row">
                    <span className="stream-agent-status">
                      {isCompleted
                        ? <span className="check">✓</span>
                        : <Dots color={PALETTE[i % 4].dot} />
                      }
                    </span>
                    <AgentPill idx={i} name={a.agentName} />
                    {liveMs != null && (
                      <span className={`stream-agent-timer ${isCompleted ? 'done' : ''}`}>
                        {fmtDur(liveMs)}
                      </span>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="stream-agent-row">
                <Dots />
                <span className="stream-status-label">Orchestrator analyzes…</span>
                {elapsed > 0 && <span className="stream-agent-timer">{fmtDur(elapsed * 1000)}</span>}
              </div>
            )}
          </div>
        )}

        {/* After completion: agent pills with durations */}
        {!streaming && (
          <div className="agent-pills">
            {agents?.length > 0
              ? agents.map((a, i) => (
                  <span key={i} className="agent-pill-wrap">
                    <AgentPill idx={i} name={a.agentName} />
                    {fmtDur(a.durationMs) && <span className="pill-dur">{fmtDur(a.durationMs)}</span>}
                  </span>
                ))
              : (
                  <span className="agent-pill-wrap">
                    <span className="agent-pill" style={{ background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)', color: '#94a3b8' }}>
                      <span className="agent-dot" style={{ background: '#94a3b8' }} />
                      Orchestrator
                    </span>
                    {fmtDur(totalMs) && <span className="pill-dur">{fmtDur(totalMs)}</span>}
                  </span>
                )
            }
          </div>
        )}

        {/* After completion: show full content or error */}
        {!streaming && (
          fatalError ? (
            <ErrorBanner error={fatalError} />
          ) : !content ? (
            <div className="error-banner" style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
              <div className="error-banner-icon" style={{ color: '#d97706' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <div>
                <div className="error-banner-title" style={{ color: '#b45309' }}>Response not captured</div>
                <div className="error-banner-msg">This request did not complete — likely due to insufficient API credits or a billing limit at the time.</div>
                <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer" className="error-banner-link">Go to Anthropic billing →</a>
              </div>
            </div>
          ) : (
            <>
              <div className="assistant-content">
                <Markdown text={content} />
              </div>
              {files?.length > 0 && (
                <div className="file-downloads">
                  {files.map(f => (
                    <a
                      key={f.fileId}
                      className="file-download-btn"
                      href={`/api/download/${f.fileId}`}
                      download={f.filename || 'download'}
                    >
                      <div className="file-icon">{fileIcon(f.contentType)}</div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{f.filename || 'Download file'}</div>
                        <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>Click to download</div>
                      </div>
                      <svg style={{ marginLeft: 'auto' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {!streaming && totalMs && (
          <div className="total-time">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Total processing time: <strong>{fmtDur(totalMs)}</strong>
          </div>
        )}
        {!streaming && time && <div className="msg-time">{time}</div>}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [conversations, setConversations]   = useState([])
  const [historyError, setHistoryError]     = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [activeConvId, setActiveConvId]     = useState(null)
  const [messages, setMessages]             = useState([])
  const [input, setInput]                   = useState('')
  const [running, setRunning]               = useState(false)
  const [sessionId, setSessionId]           = useState(null)
  const [activeAgents, setActiveAgents]     = useState([])
  const [completedAgents, setCompletedAgents] = useState([])
  const [allAgents, setAllAgents]           = useState([])
  const [elapsed, setElapsed]               = useState(0)
  const [renamingId, setRenamingId]         = useState(null)
  const [renameValue, setRenameValue]       = useState('')
  const [hoveredConvId, setHoveredConvId]   = useState(null)
  const [attachedFiles, setAttachedFiles]   = useState([])  // [{fileId, filename, contentType, size}]
  const [uploading, setUploading]           = useState(false)
  const sendTimeRef        = useRef(null)  // ms when send() called
  const agentStartTimesRef = useRef({})    // threadId → client ms
  const agentEndTimesRef   = useRef({})    // threadId → client ms

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
  const fileInputRef = useRef(null)
  const pollingRef   = useRef(null)
  const timerRef     = useRef(null)
  const streamIdRef  = useRef(null)
  const renameRef    = useRef(null)

  useEffect(() => { loadHistory() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, running])

  // ── History ────────────────────────────────────────────────────────────────
  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError(null)
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15000)
    try {
      const r = await fetch('/api/history', { signal: ctrl.signal })
      clearTimeout(t)
      if (!r.ok) throw new Error(`Server error ${r.status}`)
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setConversations(d.conversations || [])
    } catch (e) {
      clearTimeout(t)
      if (e.name === 'AbortError') setHistoryError('Request timed out — check Vercel env vars (NEXT_PUBLIC_SUPABASE_URL)')
      else setHistoryError(e.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  async function generateTitle(prompt) {
    try {
      const r = await fetch('/api/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      const d = await r.json()
      return d.title || prompt.slice(0, 60)
    } catch (_) {
      return prompt.slice(0, 60)
    }
  }

  async function saveHistory(convId, sid, title, msgs, agents) {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // title=null means "keep existing title" — API will only set it if provided
        body: JSON.stringify({ conversationId: convId, sessionId: sid, title, messages: msgs, agents, status: 'done' })
      })
      loadHistory()
    } catch (_) {}
  }

  async function renameConv(convId, newTitle) {
    if (!newTitle.trim()) return
    try {
      await fetch('/api/history', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, title: newTitle.trim() })
      })
      setConversations(prev => prev.map(c =>
        c.conversation_id === convId ? { ...c, title: newTitle.trim() } : c
      ))
    } catch (_) {}
    setRenamingId(null)
  }

  async function deleteConv(convId) {
    try {
      await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId })
      })
      setConversations(prev => prev.filter(c => c.conversation_id !== convId))
      if (activeConvId === convId) newChat()
    } catch (_) {}
  }

  function startRename(conv, e) {
    e.stopPropagation()
    setRenamingId(conv.conversation_id)
    setRenameValue(conv.title || '')
    setTimeout(() => renameRef.current?.focus(), 50)
  }

  function confirmRename(e) {
    e.preventDefault()
    if (renamingId) renameConv(renamingId, renameValue)
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function stopPolling() {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current)   clearInterval(timerRef.current)
  }

  function newChat() {
    stopPolling()
    setActiveConvId(null); setMessages([]); setSessionId(null)
    setInput(''); setRunning(false)
    setActiveAgents([]); setCompletedAgents([]); setAllAgents([])
    setElapsed(0); streamIdRef.current = null
    setAttachedFiles([])
    agentStartTimesRef.current = {}; agentEndTimesRef.current = {}
    inputRef.current?.focus()
  }

  function openConv(conv) {
    stopPolling()
    setRunning(false)
    setActiveConvId(conv.conversation_id)
    setMessages(Array.isArray(conv.messages) ? conv.messages : [])
    setSessionId(conv.session_id)
    setActiveAgents([]); setCompletedAgents([]); setAllAgents([])
    setElapsed(0)
  }

  // ── Send ───────────────────────────────────────────────────────────────────
  async function send() {
    if (!input.trim() || running) return
    const text = input.trim()
    const filesToSend = [...attachedFiles]
    setInput('')
    setAttachedFiles([])
    setRunning(true)
    sendTimeRef.current = Date.now()
    agentStartTimesRef.current = {}; agentEndTimesRef.current = {}
    setActiveAgents([]); setCompletedAgents([]); setAllAgents([])
    setElapsed(0)

    const now = () => new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    const userMsg = { id: Date.now(), role: 'user', content: text, time: now(), attachments: filesToSend }
    const streamId = Date.now() + 1
    streamIdRef.current = streamId
    const streamMsg = { id: streamId, role: 'assistant', content: '', streaming: true, agents: [] }
    setMessages(prev => [...prev, userMsg, streamMsg])

    const isNewConv = !activeConvId
    const convId = activeConvId || `conv_${Date.now()}`
    if (!activeConvId) setActiveConvId(convId)

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, files: filesToSend })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const sid = data.sessionId
      setSessionId(sid)

      let allAcc = [], activeAcc = [], completedAcc = [], filesAcc = []
      let polls = 0
      const MAX_POLLS = 2700   // 2700 × 2s = 90 minutes

      pollingRef.current = setInterval(async () => {
        if (++polls > MAX_POLLS) {
          stopPolling()
          finish(
            'The agent is taking longer than expected. Check Claude Console for the result — a download link will appear here if a file was produced.',
            allAcc, convId, sid, text, userMsg, filesAcc
          )
          return
        }
        try {
          const ev = await (await fetch(`/api/events?sessionId=${sid}`)).json()
          if (ev.error) { console.error('Events:', ev.error); return }

          if (ev.agentsEngaged?.length) {
            // Record client-side start time on first sight of each agent
            ev.agentsEngaged.forEach(a => {
              if (!agentStartTimesRef.current[a.threadId]) {
                agentStartTimesRef.current[a.threadId] = Date.now()
              }
            })
            allAcc = ev.agentsEngaged
            setAllAgents([...allAcc])
          }
          if (ev.activeAgents)    { activeAcc = ev.activeAgents;    setActiveAgents([...activeAcc]) }
          if (ev.completedAgents) {
            // Record client-side end time on first completion
            ev.completedAgents.forEach(tid => {
              if (!agentEndTimesRef.current[tid]) {
                agentEndTimesRef.current[tid] = Date.now()
              }
            })
            completedAcc = ev.completedAgents
            setCompletedAgents([...completedAcc])
          }
          if (ev.files?.length) { filesAcc = ev.files }

          // Build enriched agents with client-side durations for streaming display
          const enriched = allAcc.map(a => ({
            ...a,
            clientStartMs:  agentStartTimesRef.current[a.threadId] || null,
            clientEndMs:    agentEndTimesRef.current[a.threadId]   || null,
            clientDurMs:    agentEndTimesRef.current[a.threadId] && agentStartTimesRef.current[a.threadId]
                              ? agentEndTimesRef.current[a.threadId] - agentStartTimesRef.current[a.threadId]
                              : null
          }))

          // Always update the streaming message with latest content + status log
          setMessages(prev => prev.map(m =>
            m.id === streamIdRef.current ? {
              ...m,
              content: ev.outputText || m.content,
              agents: enriched,
              files: filesAcc,
              statusLog: ev.statusLog || [],
              fatalError: ev.fatalError || null
            } : m
          ))

          if (ev.fatalError || ev.done) {
            stopPolling()
            const err = ev.fatalError || (!ev.outputText ? {
              code: 'no_response',
              message: 'The agent did not return a response. This may be due to a billing limit or API error. Check Claude Console for details.'
            } : null)
            finish(ev.outputText || '', allAcc, convId, sid, text, userMsg, filesAcc, err, isNewConv)
          }
        } catch (e) { console.error('Poll:', e) }
      }, 2000)

    } catch (err) {
      stopPolling()
      setRunning(false)
      setMessages(prev => prev.map(m =>
        m.id === streamIdRef.current ? { ...m, content: `Error: ${err.message}`, streaming: false } : m
      ))
    }
  }

  function finish(finalText, agents, convId, sid, userText, userMsg, files = [], fatalError = null, isNewConv = false) {
    stopPolling()
    setRunning(false)
    setActiveAgents([])
    setElapsed(0)
    const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    const totalMs = sendTimeRef.current ? Date.now() - sendTimeRef.current : null
    // Enrich agents with client-side durations (fallback when server timestamps missing)
    const enrichedAgents = agents.map(a => ({
      ...a,
      durationMs: a.durationMs
        || (agentEndTimesRef.current[a.threadId] && agentStartTimesRef.current[a.threadId]
            ? agentEndTimesRef.current[a.threadId] - agentStartTimesRef.current[a.threadId]
            : null)
    }))
    const final = {
      id: streamIdRef.current, role: 'assistant',
      content: finalText, streaming: false,
      agents: enrichedAgents, files, fatalError, statusLog: [], time: now, totalMs
    }
    setMessages(prev => {
      const updated = prev.map(m => m.id === streamIdRef.current ? final : m)

      if (isNewConv) {
        // New conversation — generate a contextual title from the first prompt
        if (fatalError) {
          // Skip title API on error, use truncated prompt
          const t = userText.length > 55 ? userText.slice(0, 55) + '…' : userText
          saveHistory(convId, sid, t, updated, agents)
        } else {
          generateTitle(userText).then(t => saveHistory(convId, sid, t, updated, agents))
        }
      } else {
        // Follow-up message — keep existing title, just update messages
        saveHistory(convId, sid, null, updated, agents)
      }
      return updated
    })
  }

  async function uploadFile(file) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/upload', { method: 'POST', body: form })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setAttachedFiles(prev => [...prev, d])
    } catch (e) {
      alert(`Upload failed: ${e.message}`)
    } finally {
      setUploading(false)
    }
  }

  function removeAttached(fileId) {
    setAttachedFiles(prev => prev.filter(f => f.fileId !== fileId))
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Sidebar grouping ───────────────────────────────────────────────────────
  const grouped = () => {
    const today = new Date().toDateString()
    const yest  = new Date(Date.now() - 86400000).toDateString()
    const g = { Today: [], Yesterday: [], Earlier: [] }
    conversations.forEach(c => {
      const d = new Date(c.created_at).toDateString()
      if (d === today) g.Today.push(c)
      else if (d === yest) g.Yesterday.push(c)
      else g.Earlier.push(c)
    })
    return g
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #f4f5f7; color: #1e293b; font-family: 'Inter', -apple-system, sans-serif; }

        /* ── Layout ── */
        .shell { display: flex; height: 100vh; overflow: hidden; }

        /* ── Sidebar ── */
        .sidebar { width: 268px; background: #1e293b; border-right: none; display: flex; flex-direction: column; flex-shrink: 0; box-shadow: 2px 0 12px rgba(0,0,0,.12); }
        .sb-head { padding: 20px 18px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.08); }
        .sb-logo { width: 34px; height: 34px; border-radius: 10px; background: linear-gradient(135deg,#2563eb,#60a5fa); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; color: #fff; flex-shrink: 0; box-shadow: 0 2px 10px rgba(37,99,235,.5); }
        .sb-brand { font-weight: 700; font-size: 14px; color: #f1f5f9; letter-spacing: -0.01em; }
        .sb-sub   { font-size: 11px; color: #64748b; margin-top: 1px; }
        .sb-actions { padding: 14px 12px 8px; }
        .new-btn { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #94a3b8; font-size: 13px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all .15s; text-align: left; font-family: inherit; }
        .new-btn:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.2); color: #f1f5f9; }
        .sb-list { flex: 1; overflow-y: auto; padding: 4px 10px 12px; }
        .sb-group { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.1em; padding: 16px 8px 6px; font-weight: 600; }
        .conv-item { position: relative; border-radius: 10px; margin-bottom: 2px; display: flex; align-items: center; transition: background .12s; }
        .conv-item:hover { background: rgba(255,255,255,.07); }
        .conv-item.active { background: rgba(37,99,235,.35); }
        .conv-btn-inner { flex: 1; padding: 9px 10px; border: none; background: transparent; cursor: pointer; text-align: left; color: #94a3b8; min-width: 0; font-family: inherit; }
        .conv-item.active .conv-btn-inner { color: #e0eaff; }
        .conv-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: inherit; margin-bottom: 2px; }
        .conv-meta  { font-size: 11px; color: #475569; display: flex; align-items: center; gap: 5px; }
        .conv-dot   { width: 5px; height: 5px; border-radius: 50%; }
        .conv-actions { display: flex; gap: 2px; padding-right: 6px; flex-shrink: 0; }
        .conv-action-btn { width: 24px; height: 24px; border-radius: 6px; border: none; background: transparent; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all .12s; }
        .conv-action-btn:hover { background: rgba(255,255,255,.1); color: #94a3b8; }
        .conv-action-btn.delete:hover { color: #fca5a5; background: rgba(239,68,68,.2); }
        .rename-form { flex: 1; padding: 4px 6px; }
        .rename-input { width: 100%; background: rgba(255,255,255,.1); border: 1.5px solid #60a5fa; border-radius: 6px; color: #f1f5f9; font-size: 13px; padding: 4px 8px; outline: none; font-family: inherit; }
        .sb-foot { padding: 14px 18px; border-top: 1px solid rgba(255,255,255,.08); display: flex; align-items: center; gap: 8px; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .status-label { font-size: 11px; color: #475569; font-weight: 500; }

        /* Error / empty states */
        .hist-err { margin: 8px; padding: 12px 14px; border-radius: 10px; background: rgba(239,68,68,.12); border: 1px solid rgba(239,68,68,.25); }
        .hist-err-title { font-size: 11px; color: #fca5a5; font-weight: 600; margin-bottom: 4px; }
        .hist-err-body  { font-size: 11px; color: #64748b; word-break: break-word; line-height: 1.5; }
        .retry-btn { margin-top: 8px; font-size: 11px; color: #93c5fd; background: none; border: none; cursor: pointer; padding: 0; font-weight: 500; }
        .hist-empty { padding: 24px 12px; font-size: 12px; color: #475569; text-align: center; line-height: 1.7; }

        /* ── Main chat area ── */
        .main   { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #f0f2f5; }
        .topbar { height: 58px; padding: 0 28px; display: flex; align-items: center; justify-content: space-between; background: #fff; border-bottom: 2px solid #e8eaed; flex-shrink: 0; box-shadow: 0 1px 8px rgba(0,0,0,.06); }
        .topbar-title { font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; }
        .console-link { font-size: 12px; color: #64748b; text-decoration: none; background: #f4f5f7; border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 13px; transition: all .15s; font-weight: 600; }
        .console-link:hover { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }

        .messages { flex: 1; overflow-y: auto; padding: 36px 0; }
        .messages-inner { max-width: 780px; margin: 0 auto; padding: 0 32px; }

        /* ── Empty state ── */
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 24px; text-align: center; padding: 40px 20px; }
        .empty-logo  { width: 56px; height: 56px; border-radius: 18px; background: linear-gradient(135deg,#1d4ed8,#3b82f6); display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; color: #fff; box-shadow: 0 8px 24px rgba(59,130,246,.25); }
        .empty-title { font-size: 24px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em; }
        .empty-sub   { font-size: 15px; color: #64748b; line-height: 1.7; max-width: 400px; }
        .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 560px; }
        .sug-btn { padding: 8px 16px; border-radius: 20px; border: 1.5px solid #e2e8f0; background: #fff; color: #475569; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; font-family: inherit; box-shadow: 0 1px 3px rgba(0,0,0,.05); }
        .sug-btn:hover { border-color: #93c5fd; color: #2563eb; background: #f8faff; box-shadow: 0 2px 8px rgba(59,130,246,.1); }

        /* ── Messages ── */
        .msg-row { display: flex; gap: 14px; margin-bottom: 28px; animation: fadeUp .2s ease; }
        .user-row { justify-content: flex-end; }
        .user-bubble { max-width: 72%; }
        .bubble-text { background: #2563eb; color: #fff; border-radius: 20px 20px 5px 20px; padding: 12px 18px; font-size: 15px; line-height: 1.65; font-weight: 400; box-shadow: 0 2px 12px rgba(37,99,235,.25); }
        .bubble-time { font-size: 11px; color: #94a3b8; text-align: right; margin-top: 5px; }
        .user-attachments { display: flex; flex-direction: column; gap: 5px; margin-bottom: 8px; }
        .user-attachment { display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px; background: #1d4ed8; border: 1px solid rgba(255,255,255,.3); border-radius: 10px; color: #fff; font-size: 12px; font-weight: 500; text-decoration: none; transition: background .15s; max-width: 260px; }
        .user-attachment:hover { background: #1e40af; }
        .user-attachment-icon { flex-shrink: 0; opacity: .85; }
        .user-attachment-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }

        .assistant-row { align-items: flex-start; }
        .avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg,#1d4ed8,#3b82f6); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; box-shadow: 0 2px 8px rgba(59,130,246,.2); }
        .assistant-body { flex: 1; min-width: 0; }
        .agent-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; align-items: center; }
        .agent-pill-wrap { display: inline-flex; align-items: center; gap: 5px; }
        .agent-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 500; letter-spacing: .02em; }
        .agent-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .pill-dur { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .agent-timer { font-size: 11px; color: #94a3b8; font-weight: 500; }
        .agent-timer.done-timer { color: #22c55e; }
        .assistant-content { font-size: 15px; line-height: 1.8; color: #334155; background: #fff; border-radius: 4px 20px 20px 20px; padding: 16px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
        .msg-time { font-size: 11px; color: #94a3b8; margin-top: 6px; padding-left: 4px; }

        /* Error banner */
        .error-banner { display:flex; gap:12px; padding:14px 16px; background:#fff1f2; border:1px solid #fecdd3; border-radius:12px; margin-top:4px; }
        .error-banner-icon { color:#ef4444; flex-shrink:0; margin-top:2px; }
        .error-banner-title { font-size:13px; font-weight:600; color:#ef4444; margin-bottom:4px; }
        .error-banner-msg { font-size:13px; color:#64748b; line-height:1.5; }
        .error-banner-link { display:inline-block; margin-top:8px; font-size:12px; color:#2563eb; text-decoration:underline; text-underline-offset:2px; font-weight:500; }

        /* Status log */
        .status-log { display:flex; flex-direction:column; gap:4px; margin-bottom:10px; padding: 10px 14px; background: #f8faff; border-radius: 10px; border: 1px solid #e0e9ff; }
        .status-log-line { font-size:12px; color:#64748b; display:flex; align-items:center; gap:6px; }
        .status-log-line:last-child { color:#2563eb; font-weight:500; }

        /* Files */
        .file-downloads { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
        .file-download-btn { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; background: #fff; border: 1.5px solid #e0e9ff; border-radius: 12px; color: #2563eb; font-size: 13px; font-weight: 500; text-decoration: none; transition: all .15s; width: fit-content; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
        .file-download-btn:hover { background: #f8faff; border-color: #93c5fd; box-shadow: 0 3px 10px rgba(59,130,246,.12); }
        .file-icon { width: 30px; height: 30px; border-radius: 8px; background: #eff6ff; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* ── Pipeline bar ── */
        .pipeline-bar   { margin-bottom: 24px; animation: fadeUp .2s ease; }
        .pipeline-inner { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border: 1px solid #e8eaed; border-radius: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
        .pipeline-left  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .pipeline-label { font-size: 13px; color: #64748b; font-weight: 500; }
        .pipeline-agent { display: flex; align-items: center; gap: 6px; }
        .pipeline-agent.done { opacity: .6; }
        .pipeline-elapsed { font-size: 11px; color: #94a3b8; flex-shrink: 0; font-weight: 500; }
        .check { color: #22c55e; font-size: 12px; font-weight: 700; }

        /* Dots */
        .dots { display: inline-flex; gap: 4px; align-items: center; }
        .dot  { width: 5px; height: 5px; border-radius: 50%; display: inline-block; animation: bounce 1.2s ease-in-out infinite; }
        .cursor { display: inline-block; width: 2px; height: 16px; background: #2563eb; margin-left: 2px; vertical-align: text-bottom; animation: blink .7s ease-in-out infinite; border-radius: 1px; }

        /* ── Markdown ── */
        .md-h1 { font-size: 20px; font-weight: 700; color: #0f172a; margin: 20px 0 10px; padding-bottom: 8px; border-bottom: 2px solid #f0f1f3; letter-spacing: -0.02em; }
        .md-h2 { font-size: 17px; font-weight: 700; color: #0f172a; margin: 16px 0 8px; letter-spacing: -0.01em; }
        .md-h3 { font-size: 14px; font-weight: 600; color: #475569; margin: 12px 0 5px; text-transform: uppercase; letter-spacing: .06em; }
        .md-p  { margin: 4px 0; color: #334155; line-height: 1.8; }
        .md-ul { padding-left: 22px; margin: 8px 0 12px; list-style: disc; color: #334155; }
        .md-ol { padding-left: 22px; margin: 8px 0 12px; list-style: decimal; color: #334155; }
        .md-ul li, .md-ol li { margin-bottom: 5px; line-height: 1.7; }
        .md-hr  { border: none; border-top: 2px solid #f0f1f3; margin: 18px 0; }
        .md-gap { height: 10px; }
        .md-link { color: #2563eb; text-decoration: underline; text-underline-offset: 2px; }
        .inline-code { background: #f1f5f9; border: 1px solid #e2e8f0; padding: 2px 6px; border-radius: 5px; font-size: .88em; font-family: 'DM Mono', monospace; color: #0f172a; }
        .code-block { background: #1e293b; border-radius: 10px; margin: 12px 0; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
        .code-lang  { padding: 8px 16px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #334155; font-family: 'DM Mono', monospace; background: #162032; }
        .code-block pre { padding: 16px; overflow-x: auto; }
        .code-block code { font-size: 13px; color: #e2e8f0; font-family: 'DM Mono', monospace; line-height: 1.65; }

        /* ── Input area ── */
        .input-area { padding: 16px 28px 22px; border-top: 2px solid #e2e8f0; background: #fff; flex-shrink: 0; box-shadow: 0 -2px 12px rgba(0,0,0,.06); }
        .input-wrap { max-width: 780px; margin: 0 auto; }
        .input-box  { display: flex; align-items: flex-end; gap: 12px; background: #fff; border: 2px solid #cbd5e1; border-radius: 18px; padding: 12px 16px; transition: all .2s; box-shadow: 0 2px 8px rgba(0,0,0,.07); }
        .input-box:focus-within { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37,99,235,.12), 0 2px 8px rgba(0,0,0,.07); }
        .input-box textarea { flex: 1; background: transparent; border: none; outline: none; resize: none; font-size: 15px; color: #0f172a; line-height: 1.6; font-family: inherit; max-height: 160px; overflow-y: auto; }
        .input-box textarea::placeholder { color: #94a3b8; }
        .send-btn { width: 38px; height: 38px; border-radius: 12px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; background: #2563eb; box-shadow: 0 3px 10px rgba(37,99,235,.35); }
        .send-btn:hover:not(:disabled) { background: #1d4ed8; box-shadow: 0 5px 14px rgba(37,99,235,.45); transform: translateY(-1px); }
        .send-btn:disabled { background: #e2e8f0; box-shadow: none; cursor: not-allowed; }
        .input-hint { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 10px; font-weight: 500; }

        /* ── Keyframes ── */
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); opacity:.4 } 40% { transform:translateY(-5px); opacity:1 } }
        @keyframes blink  { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:.35 } }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0,0,0,.04); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* Streaming status (compact, no content) */
        .stream-status { padding: 14px 18px; background: #fff; border-radius: 4px 20px 20px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.07); display: flex; flex-direction: column; gap: 10px; }
        .stream-agent-row { display: flex; align-items: center; gap: 8px; }
        .stream-agent-status { width: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .stream-status-label { font-size: 13px; color: #64748b; font-weight: 500; }
        .stream-agent-timer { font-size: 12px; color: #94a3b8; font-weight: 600; margin-left: auto; font-variant-numeric: tabular-nums; }
        .stream-agent-timer.done { color: #22c55e; }

        /* Total time footer */
        .total-time { display: flex; align-items: center; gap: 5px; margin-top: 12px; padding: 8px 12px; background: #f8faff; border: 1px solid #e0e9ff; border-radius: 8px; font-size: 12px; color: #64748b; width: fit-content; }

        /* File attach chips */
        .attach-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .attach-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px 4px 8px; border-radius: 20px; background: #eff6ff; border: 1px solid #bfdbfe; font-size: 12px; color: #1d4ed8; font-weight: 500; max-width: 220px; }
        .attach-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .attach-chip-rm { background: none; border: none; cursor: pointer; color: #93c5fd; padding: 0; line-height: 1; font-size: 14px; flex-shrink: 0; }
        .attach-chip-rm:hover { color: #2563eb; }
        .attach-btn { width: 34px; height: 34px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; background: #f1f5f9; color: #64748b; }
        .attach-btn:hover { background: #e2e8f0; color: #334155; }
        .attach-btn:disabled { opacity: .5; cursor: not-allowed; }
      `}</style>

      <div className="shell">
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          <div className="sb-head">
            <div className="sb-logo">B</div>
            <div>
              <div className="sb-brand">BGC Agents</div>
              <div className="sb-sub">Blue Gravity Capital</div>
            </div>
          </div>

          <div className="sb-actions">
            <button className="new-btn" onClick={newChat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New conversation
            </button>
          </div>

          <div className="sb-list">
            {historyLoading && <div className="hist-empty">Loading history…</div>}

            {historyError && (
              <div className="hist-err">
                <div className="hist-err-title">History error</div>
                <div className="hist-err-body">{historyError}</div>
                <button className="retry-btn" onClick={loadHistory}>Retry ↺</button>
              </div>
            )}

            {!historyLoading && !historyError && conversations.length === 0 && (
              <div className="hist-empty">No conversations yet.<br />Start by sending a message.</div>
            )}

            {Object.entries(grouped()).map(([group, convs]) => convs.length === 0 ? null : (
              <div key={group}>
                <div className="sb-group">{group}</div>
                {convs.map(c => (
                  <div
                    key={c.id}
                    className={`conv-item ${activeConvId === c.conversation_id ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredConvId(c.conversation_id)}
                    onMouseLeave={() => setHoveredConvId(null)}
                  >
                    {renamingId === c.conversation_id ? (
                      <form onSubmit={confirmRename} className="rename-form">
                        <input
                          ref={renameRef}
                          className="rename-input"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onBlur={() => renameConv(c.conversation_id, renameValue)}
                          onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null) }}
                        />
                      </form>
                    ) : (
                      <button className="conv-btn-inner" onClick={() => openConv(c)}>
                        <div className="conv-title">{c.title || 'Conversation'}</div>
                        <div className="conv-meta">
                          {Array.isArray(c.agents_engaged) && c.agents_engaged.slice(0,3).map((_, i) => (
                            <span key={i} className="conv-dot" style={{ background: PALETTE[i%4].dot }} />
                          ))}
                          <span>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </button>
                    )}
                    {hoveredConvId === c.conversation_id && renamingId !== c.conversation_id && (
                      <div className="conv-actions">
                        <button className="conv-action-btn" title="Rename" onClick={e => startRename(c, e)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="conv-action-btn delete" title="Delete" onClick={e => { e.stopPropagation(); deleteConv(c.conversation_id) }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="sb-foot">
            <div className="status-dot" style={{
              background: running ? '#f59e0b' : '#34d399',
              boxShadow: `0 0 6px ${running ? '#f59e0b' : '#34d399'}`,
              animation: running ? 'pulse 1.2s ease-in-out infinite' : 'none'
            }} />
            <span className="status-label">{running ? 'Pipeline active' : 'Ready'}</span>
          </div>
        </aside>

        {/* ── Main ── */}
        <main className="main">
          <div className="topbar">
            <div className="topbar-title">
              {activeConvId
                ? (conversations.find(c => c.conversation_id === activeConvId)?.title || 'Conversation')
                : 'New conversation'}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <a className="console-link" href="/files">
                📁 Files
              </a>
              {sessionId && (
                <a className="console-link" href={`https://platform.claude.com/sessions/${sessionId}`} target="_blank" rel="noopener noreferrer">
                  Console ↗
                </a>
              )}
            </div>
          </div>

          <div className="messages">
            {messages.length === 0 && !running ? (
              <div className="empty-state">
                <div className="empty-logo">O</div>
                <div>
                  <div className="empty-title">BGC Agent Workspace</div>
                  <div className="empty-sub" style={{ marginTop: 8 }}>
                    Ask anything. The Orchestrator will automatically engage the right agents.
                  </div>
                </div>
                <div className="suggestions">
                  {['Analyze company https://grenton.pl', 'Collect data on RES market in Poland 2025', 'Verify this investment document', 'Compare two B2B SaaS competitors'].map(s => (
                    <button key={s} className="sug-btn" onClick={() => setInput(s)}>{s}</button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages-inner">
                {messages.map(m =>
                  m.role === 'user'
                    ? <UserMsg key={m.id} content={m.content} time={m.time} attachments={m.attachments} />
                    : <AssistantMsg key={m.id} content={m.content} agents={m.agents} time={m.time} streaming={m.streaming} files={m.files} fatalError={m.fatalError} statusLog={m.statusLog} totalMs={m.totalMs} elapsed={m.streaming ? elapsed : 0} />
                )}
                <PipelineBar active={activeAgents} completed={completedAgents} all={allAgents} running={running} elapsed={elapsed} />
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="input-area">
            <div className="input-wrap">
              {attachedFiles.length > 0 && (
                <div className="attach-chips">
                  {attachedFiles.map(f => (
                    <div key={f.fileId} className="attach-chip">
                      <span className="attach-chip-name" title={f.filename}>{f.filename}</span>
                      <button className="attach-chip-rm" onClick={() => removeAttached(f.fileId)}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="input-box">
                <button
                  className="attach-btn"
                  title="Attach file (Word, PDF, Excel, PowerPoint…)"
                  disabled={running || uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  }
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md"
                  multiple
                  onChange={e => {
                    Array.from(e.target.files || []).forEach(uploadFile)
                    e.target.value = ''
                  }}
                />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Message BGC Agents… (Enter to send, Shift+Enter for new line)"
                  disabled={running}
                  rows={1}
                  onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px' }}
                />
                <button className="send-btn" onClick={send} disabled={running || !input.trim()}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
                  </svg>
                </button>
              </div>
              <div className="input-hint">Powered by Blue Gravity Capital Agents · Orchestrator → Research · QA · Synthesis</div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
