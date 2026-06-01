'use client'

import { useState, useEffect, useRef } from 'react'

const AGENT_COLORS = {
  0: { bg: 'rgba(46,95,163,0.15)', color: '#93b8e8', border: 'rgba(46,95,163,0.3)', label: 'Research Agent' },
  1: { bg: 'rgba(224,123,0,0.15)', color: '#f5a623', border: 'rgba(224,123,0,0.3)', label: 'QA Agent' },
  2: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', label: 'Synthesis Agent' },
  3: { bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: 'rgba(167,139,250,0.3)', label: 'Agent' },
}

// Simple markdown renderer — handles headers, bold, italic, lists, code, links
function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let i = 0
  let keyCounter = 0
  const k = () => keyCounter++

  const inlineFormat = (str) => {
    const parts = []
    const re = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((https?:\/\/[^\)]+)\))/g
    let last = 0, m
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parts.push(str.slice(last, m.index))
      if (m[1]) parts.push(<strong key={k()}>{m[2]}</strong>)
      else if (m[3]) parts.push(<em key={k()}>{m[4]}</em>)
      else if (m[5]) parts.push(<code key={k()} style={{ background: '#1a2235', padding: '1px 5px', borderRadius: 3, fontSize: '0.9em', fontFamily: 'DM Mono, monospace', color: '#93b8e8' }}>{m[6]}</code>)
      else if (m[7]) parts.push(<a key={k()} href={m[9]} target="_blank" rel="noopener noreferrer" style={{ color: '#93b8e8', textDecoration: 'underline' }}>{m[8]}</a>)
      last = m.index + m[0].length
    }
    if (last < str.length) parts.push(str.slice(last))
    return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : parts
  }

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={k()} style={{
          background: '#0d1117', border: '1px solid #1e2d47', borderRadius: 8,
          padding: '14px 16px', overflowX: 'auto', margin: '12px 0',
          fontSize: 13, fontFamily: 'DM Mono, monospace', color: '#e8edf5', lineHeight: 1.6
        }}>
          {lang && <div style={{ fontSize: 10, color: '#6b7fa3', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{lang}</div>}
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      elements.push(<h1 key={k()} style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#e8edf5', margin: '20px 0 8px', borderBottom: '1px solid #1e2d47', paddingBottom: 6 }}>{inlineFormat(line.slice(2))}</h1>)
      i++; continue
    }
    // H2
    if (line.startsWith('## ')) {
      elements.push(<h2 key={k()} style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Syne, sans-serif', color: '#e8edf5', margin: '16px 0 6px' }}>{inlineFormat(line.slice(3))}</h2>)
      i++; continue
    }
    // H3
    if (line.startsWith('### ')) {
      elements.push(<h3 key={k()} style={{ fontSize: 13, fontWeight: 600, color: '#93b8e8', margin: '12px 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{inlineFormat(line.slice(4))}</h3>)
      i++; continue
    }

    // Bullet list
    if (line.match(/^[-*]\s/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push(<li key={k()} style={{ marginBottom: 4, color: '#e8edf5' }}>{inlineFormat(lines[i].slice(2))}</li>)
        i++
      }
      elements.push(<ul key={k()} style={{ paddingLeft: 20, margin: '6px 0 10px', listStyle: 'disc' }}>{items}</ul>)
      continue
    }

    // Numbered list
    if (line.match(/^\d+\.\s/)) {
      const items = []
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(<li key={k()} style={{ marginBottom: 4, color: '#e8edf5' }}>{inlineFormat(lines[i].replace(/^\d+\.\s/, ''))}</li>)
        i++
      }
      elements.push(<ol key={k()} style={{ paddingLeft: 20, margin: '6px 0 10px', listStyle: 'decimal' }}>{items}</ol>)
      continue
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      elements.push(<hr key={k()} style={{ border: 'none', borderTop: '1px solid #1e2d47', margin: '16px 0' }} />)
      i++; continue
    }

    // Blank line → spacer
    if (line.trim() === '') {
      elements.push(<div key={k()} style={{ height: 8 }} />)
      i++; continue
    }

    // Paragraph
    elements.push(<p key={k()} style={{ margin: '2px 0', color: '#e8edf5', lineHeight: 1.75 }}>{inlineFormat(line)}</p>)
    i++
  }

  return elements
}

function AgentBadge({ index, label }) {
  const c = AGENT_COLORS[index % 4]
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
      display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap'
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {label || c.label}
    </span>
  )
}

function PipelineStatus({ activeAgents, completedAgents, allAgents, isLoading, elapsed }) {
  if (!isLoading) return null
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 24, animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1F3864, #2E5FA3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e8edf5',
        border: '1px solid #2E5FA3'
      }}>O</div>

      <div style={{ flex: 1, background: '#111827', border: '1px solid #1e2d47', borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 11, color: '#6b7fa3', fontFamily: 'DM Mono' }}>Pipeline aktywny</span>
          {elapsed > 0 && <span style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono' }}>{elapsed}s</span>}
        </div>

        {activeAgents.length > 0 && (
          <div style={{ marginBottom: completedAgents.length > 0 ? 10 : 0 }}>
            <div style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', marginBottom: 6 }}>Pracuje</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeAgents.map((agent) => (
                <div key={agent.threadId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AgentBadge index={allAgents.findIndex(a => a.threadId === agent.threadId)} label={agent.agentName} />
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[0,1,2].map(j => (
                      <div key={j} style={{
                        width: 4, height: 4, borderRadius: '50%',
                        background: AGENT_COLORS[(allAgents.findIndex(a => a.threadId === agent.threadId)) % 4].color,
                        animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite`, opacity: 0.8
                      }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {completedAgents.length > 0 && (
          <div style={{ marginTop: activeAgents.length > 0 ? 10 : 0, paddingTop: activeAgents.length > 0 ? 10 : 0, borderTop: activeAgents.length > 0 ? '1px solid #1e2d47' : 'none' }}>
            <div style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', marginBottom: 6 }}>Ukończone</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {allAgents.filter(a => completedAgents.includes(a.threadId)).map((agent) => (
                <div key={agent.threadId} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#22c55e', fontSize: 10 }}>✓</span>
                  <AgentBadge index={allAgents.findIndex(a => a.threadId === agent.threadId)} label={agent.agentName} />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAgents.length === 0 && completedAgents.length === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 3 }}>
              {[0,1,2].map(j => (
                <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2E5FA3', animation: `bounce 1.2s ease-in-out ${j * 0.2}s infinite` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#6b7fa3' }}>Orchestrator analizuje zapytanie...</span>
          </div>
        )}
      </div>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{
          maxWidth: '70%', background: '#1F3864',
          border: '1px solid #2E5FA3', borderRadius: '16px 16px 4px 16px',
          padding: '12px 16px', fontSize: 14, lineHeight: 1.6, color: '#e8edf5'
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  const isStreaming = msg.streaming

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1F3864, #2E5FA3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e8edf5',
        border: '1px solid #2E5FA3'
      }}>O</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {msg.agents && msg.agents.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', marginRight: 2 }}>via</span>
            {msg.agents.map((agent, i) => <AgentBadge key={i} index={i} label={agent.agentName} />)}
          </div>
        )}

        <div style={{
          background: '#111827', border: '1px solid #1e2d47', borderRadius: 12,
          padding: '14px 18px', fontSize: 14, lineHeight: 1.75
        }}>
          {isStreaming && !msg.content ? (
            <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#2E5FA3', animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          ) : (
            <div>{renderMarkdown(msg.content)}</div>
          )}
          {isStreaming && msg.content && (
            <span style={{ display: 'inline-block', width: 8, height: 14, background: '#2E5FA3', marginLeft: 2, animation: 'pulse 0.8s ease-in-out infinite', verticalAlign: 'text-bottom' }} />
          )}
        </div>

        {!isStreaming && msg.time && (
          <div style={{ fontSize: 10, color: '#6b7fa3', marginTop: 6, fontFamily: 'DM Mono' }}>{msg.time}</div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [conversations, setConversations] = useState([])
  const [historyError, setHistoryError] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [activeAgents, setActiveAgents] = useState([])
  const [completedAgents, setCompletedAgents] = useState([])
  const [allAgents, setAllAgents] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const pollingRef = useRef(null)
  const elapsedRef = useRef(null)
  const streamingIdRef = useRef(null)

  useEffect(() => { loadConversations() }, [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function loadConversations() {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setConversations(data.conversations || [])
    } catch (e) {
      setHistoryError(e.message)
    } finally {
      setHistoryLoading(false)
    }
  }

  function newConversation() {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    setActiveConvId(null)
    setMessages([])
    setCurrentSessionId(null)
    setInput('')
    setIsLoading(false)
    setActiveAgents([])
    setCompletedAgents([])
    setAllAgents([])
    setElapsed(0)
    streamingIdRef.current = null
    inputRef.current?.focus()
  }

  function openConversation(conv) {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (elapsedRef.current) clearInterval(elapsedRef.current)
    setIsLoading(false)
    setActiveConvId(conv.conversation_id)
    const msgs = Array.isArray(conv.messages) ? conv.messages : []
    setMessages(msgs)
    setCurrentSessionId(conv.session_id)
    setActiveAgents([])
    setCompletedAgents([])
    setAllAgents([])
    setElapsed(0)
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)
    setActiveAgents([])
    setCompletedAgents([])
    setAllAgents([])
    setElapsed(0)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    }

    // Add streaming placeholder message
    const streamId = Date.now() + 1
    streamingIdRef.current = streamId
    const streamingMsg = { id: streamId, role: 'assistant', content: '', streaming: true, agents: [] }
    setMessages(prev => [...prev, userMsg, streamingMsg])

    const convId = activeConvId || `conv_${Date.now()}`
    if (!activeConvId) setActiveConvId(convId)

    // Start elapsed timer
    elapsedRef.current = setInterval(() => setElapsed(s => s + 1), 1000)

    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const sid = data.sessionId
      setCurrentSessionId(sid)

      let lastTimestamp = null
      let outputText = ''
      let allAgentsAccum = []
      let activeAgentsAccum = []
      let completedAgentsAccum = []
      let pollCount = 0
      const maxPolls = 400

      pollingRef.current = setInterval(async () => {
        pollCount++
        if (pollCount > maxPolls) {
          clearInterval(pollingRef.current)
          clearInterval(elapsedRef.current)
          finishMessage(outputText || 'Timeout — agent nie odpowiedział w czasie.', allAgentsAccum, convId, sid, userMessage, userMsg)
          return
        }

        try {
          const url = `/api/events?sessionId=${sid}${lastTimestamp ? `&afterTimestamp=${encodeURIComponent(lastTimestamp)}` : ''}`
          const evRes = await fetch(url)
          const evData = await evRes.json()

          if (evData.error) {
            console.error('Events error:', evData.error)
            return
          }

          if (evData.lastTimestamp) lastTimestamp = evData.lastTimestamp

          if (evData.agentsEngaged?.length > 0) {
            const newAgents = evData.agentsEngaged.filter(a => !allAgentsAccum.find(x => x.threadId === a.threadId))
            allAgentsAccum = [...allAgentsAccum, ...newAgents]
            setAllAgents([...allAgentsAccum])
          }
          if (evData.activeAgents !== undefined) {
            activeAgentsAccum = evData.activeAgents
            setActiveAgents([...activeAgentsAccum])
          }
          if (evData.completedAgents !== undefined) {
            completedAgentsAccum = evData.completedAgents
            setCompletedAgents([...completedAgentsAccum])
          }

          // Show chunks incrementally in the streaming message
          if (evData.outputChunks?.length > 0) {
            outputText += evData.outputChunks.join('')
            const currentText = outputText
            setMessages(prev => prev.map(m =>
              m.id === streamingIdRef.current ? { ...m, content: currentText, agents: allAgentsAccum } : m
            ))
          }

          if (evData.done) {
            clearInterval(pollingRef.current)
            clearInterval(elapsedRef.current)
            finishMessage(outputText || 'Gotowe.', allAgentsAccum, convId, sid, userMessage, userMsg)
          }
        } catch (e) {
          console.error('Poll error:', e)
        }
      }, 1500)

    } catch (err) {
      clearInterval(elapsedRef.current)
      setIsLoading(false)
      setMessages(prev => prev.map(m =>
        m.id === streamingIdRef.current
          ? { ...m, content: `Błąd: ${err.message}`, streaming: false }
          : m
      ))
    }
  }

  async function finishMessage(finalText, agents, convId, sid, userMessage, userMsg) {
    setIsLoading(false)
    setActiveAgents([])
    setElapsed(0)
    const time = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

    const finalMsg = {
      id: streamingIdRef.current,
      role: 'assistant',
      content: finalText,
      streaming: false,
      agents,
      time
    }

    setMessages(prev => {
      const updated = prev.map(m => m.id === streamingIdRef.current ? finalMsg : m)
      const title = userMessage.length > 50 ? userMessage.slice(0, 50) + '...' : userMessage
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId, sessionId: sid, title, messages: updated, agents, status: 'done' })
      }).then(() => loadConversations()).catch(() => {})
      return updated
    })
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const groupedConversations = () => {
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const groups = { 'Dzisiaj': [], 'Wczoraj': [], 'Wcześniej': [] }
    conversations.forEach(c => {
      const d = new Date(c.created_at).toDateString()
      if (d === today) groups['Dzisiaj'].push(c)
      else if (d === yesterday) groups['Wczoraj'].push(c)
      else groups['Wcześniej'].push(c)
    })
    return groups
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* SIDEBAR */}
      <div style={{ width: 260, background: '#0d1220', borderRight: '1px solid #1e2d47', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '18px 16px', borderBottom: '1px solid #1e2d47', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1F3864, #2E5FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: '#e8edf5' }}>B</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>BGC Agents</div>
            <div style={{ fontSize: 10, color: '#6b7fa3' }}>Blue Gravity Capital</div>
          </div>
        </div>

        <div style={{ padding: '12px 10px' }}>
          <button onClick={newConversation} style={{
            width: '100%', padding: '9px 14px', background: 'transparent', border: '1px solid #1e2d47',
            borderRadius: 8, color: '#e8edf5', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a2235'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: 16, color: '#6b7fa3' }}>+</span>
            Nowa rozmowa
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
          {historyLoading && (
            <div style={{ padding: '16px 6px', fontSize: 11, color: '#6b7fa3', fontFamily: 'DM Mono', textAlign: 'center' }}>
              Ładowanie historii...
            </div>
          )}
          {historyError && (
            <div style={{ margin: '8px 6px', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: '#f87171', fontFamily: 'DM Mono', marginBottom: 4 }}>Błąd historii</div>
              <div style={{ fontSize: 10, color: '#6b7fa3', wordBreak: 'break-word' }}>{historyError}</div>
              <button onClick={loadConversations} style={{ marginTop: 8, fontSize: 10, color: '#93b8e8', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'DM Mono' }}>
                Spróbuj ponownie ↺
              </button>
            </div>
          )}
          {!historyLoading && !historyError && conversations.length === 0 && (
            <div style={{ padding: '16px 6px', fontSize: 11, color: '#6b7fa3', fontFamily: 'DM Mono', textAlign: 'center' }}>
              Brak historii rozmów
            </div>
          )}
          {Object.entries(groupedConversations()).map(([group, convs]) =>
            convs.length > 0 ? (
              <div key={group} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: '#6b7fa3', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 6px', fontFamily: 'DM Mono' }}>
                  {group}
                </div>
                {convs.map(conv => (
                  <button key={conv.id} onClick={() => openConversation(conv)} style={{
                    width: '100%', padding: '8px 10px', textAlign: 'left',
                    background: activeConvId === conv.conversation_id ? '#1a2235' : 'transparent',
                    border: activeConvId === conv.conversation_id ? '1px solid #1e2d47' : '1px solid transparent',
                    borderRadius: 6, cursor: 'pointer', marginBottom: 2, transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { if (activeConvId !== conv.conversation_id) e.currentTarget.style.background = '#111827' }}
                  onMouseLeave={e => { if (activeConvId !== conv.conversation_id) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ fontSize: 12, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {conv.title || 'Rozmowa'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {Array.isArray(conv.agents_engaged) && conv.agents_engaged.slice(0, 3).map((_, i) => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: AGENT_COLORS[i % 4].color, opacity: 0.7 }} />
                      ))}
                      <span style={{ fontSize: 10, color: '#6b7fa3', marginLeft: 2 }}>
                        {new Date(conv.created_at).toLocaleDateString('pl-PL')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : null
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d47' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isLoading ? '#E07B00' : '#22c55e',
              boxShadow: isLoading ? '0 0 6px #E07B00' : '0 0 6px #22c55e',
              animation: isLoading ? 'pulse 1.2s ease-in-out infinite' : 'none'
            }} />
            <span style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono' }}>
              {isLoading ? 'Pipeline aktywny' : 'Orchestrator aktywny'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          padding: '0 24px', height: 52, borderBottom: '1px solid #1e2d47',
          background: '#111827', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ fontSize: 13, color: '#6b7fa3', fontFamily: 'DM Mono' }}>
            {activeConvId
              ? conversations.find(c => c.conversation_id === activeConvId)?.title || 'Rozmowa'
              : 'Nowa rozmowa'}
          </div>
          {currentSessionId && (
            <a href={`https://platform.claude.com/sessions/${currentSessionId}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', textDecoration: 'none', border: '1px solid #1e2d47', borderRadius: 4, padding: '3px 8px' }}>
              Console ↗
            </a>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 10%' }}>
          {messages.length === 0 && !isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1F3864, #2E5FA3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontFamily: 'Syne', fontWeight: 800, color: '#e8edf5',
                boxShadow: '0 0 30px rgba(46,95,163,0.3)'
              }}>O</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>BGC Agent Workspace</div>
                <div style={{ fontSize: 13, color: '#6b7fa3', lineHeight: 1.6, maxWidth: 400 }}>
                  Wpisz dowolne zapytanie. Orchestrator automatycznie<br />zaangażuje odpowiednich agentów.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 500, marginTop: 8 }}>
                {['Przeanalizuj spółkę https://grenton.pl', 'Zbierz dane o rynku OZE w Polsce 2025', 'Zweryfikuj ten dokument inwestycyjny', 'Porównaj dwóch konkurentów w segmencie B2B SaaS'].map(suggestion => (
                  <button key={suggestion} onClick={() => setInput(suggestion)} style={{
                    background: '#111827', border: '1px solid #1e2d47', borderRadius: 20,
                    padding: '7px 14px', fontSize: 12, color: '#6b7fa3', cursor: 'pointer',
                    fontFamily: 'Inter', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E5FA3'; e.currentTarget.style.color = '#e8edf5' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2d47'; e.currentTarget.style.color = '#6b7fa3' }}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => <Message key={msg.id} msg={msg} />)}
              <PipelineStatus activeAgents={activeAgents} completedAgents={completedAgents} allAgents={allAgents} isLoading={isLoading} elapsed={elapsed} />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div style={{ padding: '16px 10%', borderTop: '1px solid #1e2d47', background: '#0a0e1a', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: '#111827', border: '1px solid #1e2d47', borderRadius: 12, padding: '10px 14px'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Wpisz zapytanie... (Enter aby wysłać, Shift+Enter nowa linia)"
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', fontSize: 14, color: '#e8edf5', fontFamily: 'Inter, sans-serif',
                lineHeight: 1.6, maxHeight: 120, overflow: 'auto'
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button onClick={sendMessage} disabled={isLoading || !input.trim()} style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: isLoading || !input.trim() ? '#1a2235' : '#1F3864',
              border: `1px solid ${isLoading || !input.trim() ? '#1e2d47' : '#2E5FA3'}`,
              cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', opacity: isLoading || !input.trim() ? 0.4 : 1
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e8edf5" strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
              </svg>
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#6b7fa3', textAlign: 'center', marginTop: 8, fontFamily: 'DM Mono' }}>
            Powered by Blue Gravity Capital Agents · Orchestrator → Research · QA · Synthesis
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.4; } 40% { transform: translateY(-6px); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        textarea::placeholder { color: #6b7fa3; }
      `}</style>
    </div>
  )
}
