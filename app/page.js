'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
  return (
    <div className="pipeline-bar">
      <div className="pipeline-inner">
        <div className="pipeline-left">
          {active.length === 0 && completed.length === 0 && (
            <><Dots /><span className="pipeline-label">Orchestrator analyzes…</span></>
          )}
          {active.map(a => {
            const idx = all.findIndex(x => x.threadId === a.threadId)
            return (
              <span key={a.threadId} className="pipeline-agent">
                <AgentPill idx={idx} name={a.agentName} />
                <Dots color={PALETTE[idx % 4].dot} />
              </span>
            )
          })}
          {completed.map(tid => {
            const a = all.find(x => x.threadId === tid)
            if (!a) return null
            const idx = all.findIndex(x => x.threadId === tid)
            return (
              <span key={tid} className="pipeline-agent done">
                <span className="check">✓</span>
                <AgentPill idx={idx} name={a.agentName} />
              </span>
            )
          })}
        </div>
        {elapsed > 0 && <span className="pipeline-elapsed">{elapsed}s</span>}
      </div>
    </div>
  )
}

function UserMsg({ content, time }) {
  return (
    <div className="msg-row user-row">
      <div className="user-bubble">
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

function AssistantMsg({ content, agents, time, streaming, files }) {
  return (
    <div className="msg-row assistant-row">
      <div className="avatar">O</div>
      <div className="assistant-body">
        {agents?.length > 0 && (
          <div className="agent-pills">
            {agents.map((a, i) => <AgentPill key={i} idx={i} name={a.agentName} />)}
          </div>
        )}
        <div className="assistant-content">
          {streaming && !content
            ? <Dots />
            : <Markdown text={content} />
          }
          {streaming && content && <span className="cursor" />}
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

  const bottomRef    = useRef(null)
  const inputRef     = useRef(null)
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
    try {
      const r = await fetch('/api/history')
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setConversations(d.conversations || [])
    } catch (e) {
      setHistoryError(e.message)
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
    setInput('')
    setRunning(true)
    setActiveAgents([]); setCompletedAgents([]); setAllAgents([])
    setElapsed(0)

    const now = () => new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    const userMsg = { id: Date.now(), role: 'user', content: text, time: now() }
    const streamId = Date.now() + 1
    streamIdRef.current = streamId
    const streamMsg = { id: streamId, role: 'assistant', content: '', streaming: true, agents: [] }
    setMessages(prev => [...prev, userMsg, streamMsg])

    const convId = activeConvId || `conv_${Date.now()}`
    if (!activeConvId) setActiveConvId(convId)

    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
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

          if (ev.agentsEngaged?.length) { allAcc = ev.agentsEngaged; setAllAgents([...allAcc]) }
          if (ev.activeAgents)          { activeAcc = ev.activeAgents;    setActiveAgents([...activeAcc]) }
          if (ev.completedAgents)       { completedAcc = ev.completedAgents; setCompletedAgents([...completedAcc]) }
          if (ev.files?.length)         { filesAcc = ev.files }

          if (ev.outputText || ev.files?.length) {
            setMessages(prev => prev.map(m =>
              m.id === streamIdRef.current
                ? { ...m, content: ev.outputText || m.content, agents: allAcc, files: filesAcc }
                : m
            ))
          }

          if (ev.done) {
            stopPolling()
            finish(ev.outputText || '', allAcc, convId, sid, text, userMsg, filesAcc)
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

  function finish(finalText, agents, convId, sid, userText, userMsg, files = []) {
    stopPolling()
    setRunning(false)
    setActiveAgents([])
    setElapsed(0)
    const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    const final = { id: streamIdRef.current, role: 'assistant', content: finalText, streaming: false, agents, files, time: now }
    setMessages(prev => {
      const updated = prev.map(m => m.id === streamIdRef.current ? final : m)
      generateTitle(userText).then(title => saveHistory(convId, sid, title, updated, agents))
      return updated
    })
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; background: #0f1117; color: #e2e8f0; font-family: -apple-system, 'Inter', sans-serif; }

        /* Layout */
        .shell    { display: flex; height: 100vh; overflow: hidden; }

        /* Sidebar */
        .sidebar  { width: 256px; background: #0a0c14; border-right: 1px solid #1e2535; display: flex; flex-direction: column; flex-shrink: 0; }
        .sb-head  { padding: 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #1e2535; }
        .sb-logo  { width: 30px; height: 30px; border-radius: 8px; background: linear-gradient(135deg,#1d4ed8,#3b82f6); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; color: #fff; flex-shrink: 0; }
        .sb-brand { font-weight: 700; font-size: 13px; letter-spacing: 0.02em; }
        .sb-sub   { font-size: 10px; color: #64748b; margin-top: 1px; }
        .sb-actions { padding: 10px 10px 6px; }
        .new-btn  { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #1e2535; background: transparent; color: #94a3b8; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all .15s; text-align: left; }
        .new-btn:hover { background: #131929; border-color: #2d3f5e; color: #e2e8f0; }
        .sb-list  { flex: 1; overflow-y: auto; padding: 4px 8px 12px; }
        .sb-group { font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: 0.08em; padding: 10px 6px 4px; }
        .conv-item { position: relative; border-radius: 6px; margin-bottom: 2px; display: flex; align-items: center; }
        .conv-item:hover, .conv-item.active { background: #131929; }
        .conv-btn-inner { flex: 1; padding: 7px 10px; border: none; background: transparent; cursor: pointer; text-align: left; color: #94a3b8; min-width: 0; }
        .conv-item.active .conv-btn-inner { color: #e2e8f0; }
        .conv-title { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: inherit; margin-bottom: 2px; }
        .conv-meta  { font-size: 10px; color: #475569; display: flex; align-items: center; gap: 5px; }
        .conv-dot   { width: 5px; height: 5px; border-radius: 50%; }
        .conv-actions { display: flex; gap: 2px; padding-right: 6px; flex-shrink: 0; }
        .conv-action-btn { width: 22px; height: 22px; border-radius: 4px; border: none; background: transparent; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all .12s; }
        .conv-action-btn:hover { background: #1e2535; color: #94a3b8; }
        .conv-action-btn.delete:hover { color: #f87171; background: rgba(248,113,113,.1); }
        .rename-form { flex: 1; padding: 4px 6px; }
        .rename-input { width: 100%; background: #0f1117; border: 1px solid #2d4a7a; border-radius: 4px; color: #e2e8f0; font-size: 12px; padding: 4px 7px; outline: none; font-family: inherit; }
        .sb-foot { padding: 10px 14px; border-top: 1px solid #1e2535; display: flex; align-items: center; gap: 7px; }
        .status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .status-label { font-size: 10px; color: #475569; font-family: 'DM Mono', monospace; }

        /* Error / empty states */
        .hist-err { margin: 8px; padding: 10px 12px; border-radius: 8px; background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.2); }
        .hist-err-title { font-size: 10px; color: #f87171; font-weight: 600; margin-bottom: 4px; }
        .hist-err-body  { font-size: 10px; color: #64748b; word-break: break-word; line-height: 1.5; }
        .retry-btn { margin-top: 8px; font-size: 10px; color: #60a5fa; background: none; border: none; cursor: pointer; padding: 0; }
        .hist-empty { padding: 20px 10px; font-size: 11px; color: #475569; text-align: center; line-height: 1.6; }

        /* Chat area */
        .main   { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #0f1117; }
        .topbar { height: 50px; padding: 0 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e2535; flex-shrink: 0; }
        .topbar-title { font-size: 13px; color: #64748b; }
        .console-link { font-size: 11px; color: #475569; text-decoration: none; border: 1px solid #1e2535; border-radius: 5px; padding: 3px 9px; transition: all .15s; }
        .console-link:hover { border-color: #3b82f6; color: #60a5fa; }

        .messages { flex: 1; overflow-y: auto; padding: 28px 0; }
        .messages-inner { max-width: 720px; margin: 0 auto; padding: 0 20px; }

        /* Empty state */
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; text-align: center; padding: 40px 20px; }
        .empty-logo  { width: 52px; height: 52px; border-radius: 16px; background: linear-gradient(135deg,#1d4ed8,#3b82f6); display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; color: #fff; box-shadow: 0 0 32px rgba(59,130,246,.25); }
        .empty-title { font-size: 22px; font-weight: 700; color: #e2e8f0; }
        .empty-sub   { font-size: 14px; color: #64748b; line-height: 1.6; max-width: 380px; }
        .suggestions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 520px; margin-top: 4px; }
        .sug-btn  { padding: 7px 14px; border-radius: 20px; border: 1px solid #1e2535; background: transparent; color: #64748b; font-size: 12px; cursor: pointer; transition: all .15s; }
        .sug-btn:hover { border-color: #3b82f6; color: #e2e8f0; background: rgba(59,130,246,.05); }

        /* Messages */
        .msg-row { display: flex; gap: 12px; margin-bottom: 24px; animation: fadeUp .25s ease; }
        .user-row { justify-content: flex-end; }
        .user-bubble { max-width: 70%; }
        .bubble-text { background: #1d4ed8; color: #fff; border-radius: 18px 18px 4px 18px; padding: 11px 16px; font-size: 14px; line-height: 1.6; }
        .bubble-time { font-size: 10px; color: #475569; text-align: right; margin-top: 4px; font-family: 'DM Mono', monospace; }

        .assistant-row { align-items: flex-start; }
        .avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg,#1d4ed8,#3b82f6); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .assistant-body { flex: 1; min-width: 0; }
        .agent-pills { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
        .agent-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; padding: 2px 8px; border-radius: 20px; font-family: 'DM Mono', monospace; letter-spacing: .04em; }
        .agent-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .assistant-content { font-size: 14px; line-height: 1.75; color: #cbd5e1; }
        .msg-time { font-size: 10px; color: #334155; margin-top: 8px; font-family: 'DM Mono', monospace; }
        .file-downloads { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
        .file-download-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: #131929; border: 1px solid #2d4a7a; border-radius: 8px; color: #60a5fa; font-size: 12px; text-decoration: none; transition: all .15s; width: fit-content; }
        .file-download-btn:hover { background: #1a2540; border-color: #3b82f6; color: #93c5fd; }
        .file-icon { width: 28px; height: 28px; border-radius: 6px; background: rgba(59,130,246,.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* Pipeline bar */
        .pipeline-bar   { margin-bottom: 20px; animation: fadeUp .2s ease; }
        .pipeline-inner { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #131929; border: 1px solid #1e2535; border-radius: 10px; }
        .pipeline-left  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .pipeline-label { font-size: 12px; color: #64748b; }
        .pipeline-agent { display: flex; align-items: center; gap: 6px; }
        .pipeline-agent.done { opacity: .7; }
        .pipeline-elapsed { font-size: 10px; color: #334155; font-family: 'DM Mono', monospace; flex-shrink: 0; }
        .check { color: #34d399; font-size: 11px; }

        /* Dots animation */
        .dots { display: inline-flex; gap: 4px; align-items: center; }
        .dot  { width: 5px; height: 5px; border-radius: 50%; display: inline-block; animation: bounce 1.2s ease-in-out infinite; }
        .cursor { display: inline-block; width: 2px; height: 14px; background: #3b82f6; margin-left: 2px; vertical-align: text-bottom; animation: blink .7s ease-in-out infinite; }

        /* Markdown */
        .markdown { }
        .md-h1 { font-size: 18px; font-weight: 700; color: #e2e8f0; margin: 18px 0 8px; padding-bottom: 6px; border-bottom: 1px solid #1e2535; }
        .md-h2 { font-size: 15px; font-weight: 700; color: #e2e8f0; margin: 14px 0 6px; }
        .md-h3 { font-size: 13px; font-weight: 600; color: #94a3b8; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: .05em; }
        .md-p  { margin: 3px 0; color: #cbd5e1; }
        .md-ul { padding-left: 20px; margin: 6px 0 10px; list-style: disc; color: #cbd5e1; }
        .md-ol { padding-left: 20px; margin: 6px 0 10px; list-style: decimal; color: #cbd5e1; }
        .md-ul li, .md-ol li { margin-bottom: 3px; }
        .md-hr  { border: none; border-top: 1px solid #1e2535; margin: 14px 0; }
        .md-gap { height: 8px; }
        .md-link { color: #60a5fa; text-decoration: underline; text-underline-offset: 2px; }
        .inline-code { background: #131929; border: 1px solid #1e2535; padding: 1px 5px; border-radius: 4px; font-size: .88em; font-family: 'DM Mono', monospace; color: #7dd3fc; }
        .code-block { background: #0a0c14; border: 1px solid #1e2535; border-radius: 8px; margin: 10px 0; overflow: hidden; }
        .code-lang  { padding: 6px 14px; font-size: 10px; color: #475569; text-transform: uppercase; letter-spacing: .07em; border-bottom: 1px solid #1e2535; font-family: 'DM Mono', monospace; }
        .code-block pre { padding: 14px; overflow-x: auto; }
        .code-block code { font-size: 13px; color: #e2e8f0; font-family: 'DM Mono', monospace; line-height: 1.6; }

        /* Input area */
        .input-area { padding: 12px 20px 16px; border-top: 1px solid #1e2535; background: #0f1117; flex-shrink: 0; }
        .input-wrap { max-width: 720px; margin: 0 auto; }
        .input-box  { display: flex; align-items: flex-end; gap: 10px; background: #131929; border: 1px solid #1e2535; border-radius: 12px; padding: 10px 12px; transition: border-color .15s; }
        .input-box:focus-within { border-color: #2d4a7a; }
        .input-box textarea { flex: 1; background: transparent; border: none; outline: none; resize: none; font-size: 14px; color: #e2e8f0; line-height: 1.6; font-family: inherit; max-height: 160px; overflow-y: auto; }
        .input-box textarea::placeholder { color: #334155; }
        .send-btn { width: 34px; height: 34px; border-radius: 8px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all .15s; background: #1d4ed8; }
        .send-btn:hover:not(:disabled) { background: #2563eb; }
        .send-btn:disabled { background: #131929; opacity: .4; cursor: not-allowed; }
        .input-hint { font-size: 10px; color: #334155; text-align: center; margin-top: 8px; font-family: 'DM Mono', monospace; }

        /* Keyframes */
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes bounce { 0%,80%,100% { transform:translateY(0); opacity:.35 } 40% { transform:translateY(-5px); opacity:1 } }
        @keyframes blink  { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes pulse  { 0%,100% { opacity:1 } 50% { opacity:.3 } }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e2535; border-radius: 4px; }
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
                    ? <UserMsg key={m.id} content={m.content} time={m.time} />
                    : <AssistantMsg key={m.id} content={m.content} agents={m.agents} time={m.time} streaming={m.streaming} files={m.files} />
                )}
                <PipelineBar active={activeAgents} completed={completedAgents} all={allAgents} running={running} elapsed={elapsed} />
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="input-area">
            <div className="input-wrap">
              <div className="input-box">
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
