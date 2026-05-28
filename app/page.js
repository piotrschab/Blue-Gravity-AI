'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// Kolory agentów
const AGENT_COLORS = {
  0: { bg: 'rgba(46,95,163,0.15)', color: '#93b8e8', border: 'rgba(46,95,163,0.3)', label: 'Research' },
  1: { bg: 'rgba(224,123,0,0.15)', color: '#f5a623', border: 'rgba(224,123,0,0.3)', label: 'QA' },
  2: { bg: 'rgba(34,197,94,0.12)', color: '#4ade80', border: 'rgba(34,197,94,0.25)', label: 'Synthesis' },
  3: { bg: 'rgba(167,139,250,0.15)', color: '#c4b5fd', border: 'rgba(167,139,250,0.3)', label: 'Agent 4' },
}

function AgentBadge({ index }) {
  const c = AGENT_COLORS[index % 4]
  return (
    <span style={{
      fontSize: 9, padding: '2px 7px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
      display: 'inline-flex', alignItems: 'center', gap: 4
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {c.label}
    </span>
  )
}

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#2E5FA3',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`
        }} />
      ))}
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

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'flex-start' }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #1F3864, #2E5FA3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#e8edf5',
        border: '1px solid #2E5FA3'
      }}>
        O
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Nagłówek z zaangażowanymi agentami */}
        {msg.agents && msg.agents.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', marginRight: 2 }}>via</span>
            {msg.agents.map((_, i) => <AgentBadge key={i} index={i} />)}
          </div>
        )}

        {/* Treść odpowiedzi */}
        {msg.thinking ? (
          <ThinkingDots />
        ) : (
          <div style={{
            fontSize: 14, lineHeight: 1.75, color: '#e8edf5',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word'
          }}>
            {msg.content}
          </div>
        )}

        {/* Timestamp */}
        {!msg.thinking && msg.time && (
          <div style={{ fontSize: 10, color: '#6b7fa3', marginTop: 6, fontFamily: 'DM Mono' }}>
            {msg.time}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const [conversations, setConversations] = useState([]) // historia z Supabase
  const [activeConvId, setActiveConvId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const eventSourceRef = useRef(null)

  useEffect(() => { loadConversations() }, [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadConversations() {
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (data.conversations) setConversations(data.conversations)
    } catch (e) {}
  }

  function newConversation() {
    setActiveConvId(null)
    setMessages([])
    setCurrentSessionId(null)
    setInput('')
    inputRef.current?.focus()
  }

  function openConversation(conv) {
    setActiveConvId(conv.conversation_id)
    try {
      const msgs = JSON.parse(conv.messages || '[]')
      setMessages(msgs)
    } catch {
      setMessages([])
    }
    setCurrentSessionId(conv.session_id)
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
    }

    const thinkingMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      thinking: true,
      agents: []
    }

    const newMessages = [...messages, userMsg, thinkingMsg]
    setMessages(newMessages)

    const convId = activeConvId || `conv_${Date.now()}`
    if (!activeConvId) setActiveConvId(convId)

    try {
      // Utwórz sesję i wyślij prompt
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userMessage })
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const sid = data.sessionId
      setCurrentSessionId(sid)

      // Śledź eventy
      let outputText = ''
      let engagedAgents = []
      let agentCount = 0

      const evtSource = new EventSource(`/api/events?sessionId=${sid}`)
      eventSourceRef.current = evtSource

      evtSource.onmessage = async (e) => {
        const event = JSON.parse(e.data)

        if (event.type === 'agent_engaged') {
          agentCount++
          engagedAgents = [...engagedAgents, agentCount]
          // Aktualizuj thinking message z agentami
          setMessages(prev => prev.map(m =>
            m.thinking ? { ...m, agents: engagedAgents } : m
          ))
        }

        else if (event.type === 'output_chunk') {
          outputText += event.text
          // Streamuj tekst do wiadomości
          setMessages(prev => prev.map(m =>
            m.thinking ? { ...m, thinking: false, content: outputText } : m
          ))
        }

        else if (event.type === 'done') {
          evtSource.close()
          setIsLoading(false)

          const finalText = event.finalOutput || outputText || 'Pipeline zakończony.'
          const time = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })

          const assistantMsg = {
            id: Date.now() + 2,
            role: 'assistant',
            content: finalText,
            thinking: false,
            agents: engagedAgents,
            time
          }

          const finalMessages = [...messages, userMsg, assistantMsg]
          setMessages(finalMessages)

          // Zapisz do Supabase
          const title = userMessage.length > 50 ? userMessage.slice(0, 50) + '...' : userMessage
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: convId,
              sessionId: sid,
              title,
              messages: finalMessages.filter(m => !m.thinking),
              agents: engagedAgents,
              status: 'done'
            })
          })

          loadConversations()
        }

        else if (event.type === 'error') {
          evtSource.close()
          setIsLoading(false)
          setMessages(prev => prev.map(m =>
            m.thinking ? { ...m, thinking: false, content: `Błąd: ${event.message}` } : m
          ))
        }
      }

      evtSource.onerror = () => {
        evtSource.close()
        setIsLoading(false)
        if (!outputText) {
          setMessages(prev => prev.map(m =>
            m.thinking ? { ...m, thinking: false, content: 'Połączenie przerwane. Spróbuj ponownie.' } : m
          ))
        }
      }

    } catch (err) {
      setIsLoading(false)
      setMessages(prev => prev.map(m =>
        m.thinking ? { ...m, thinking: false, content: `Błąd: ${err.message}` } : m
      ))
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
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
      <div style={{
        width: 260, background: '#0d1220', borderRight: '1px solid #1e2d47',
        display: 'flex', flexDirection: 'column', flexShrink: 0
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px', borderBottom: '1px solid #1e2d47',
          display: 'flex', alignItems: 'center', gap: 10
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #1F3864, #2E5FA3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 12, color: '#e8edf5' }}>B</span>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>BGC Agents</div>
            <div style={{ fontSize: 10, color: '#6b7fa3' }}>Blue Gravity Capital</div>
          </div>
        </div>

        {/* New chat */}
        <div style={{ padding: '12px 10px' }}>
          <button onClick={newConversation} style={{
            width: '100%', padding: '9px 14px',
            background: 'transparent', border: '1px solid #1e2d47',
            borderRadius: 8, color: '#e8edf5', fontSize: 13,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: 'Inter, sans-serif', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1a2235'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 16, color: '#6b7fa3' }}>+</span>
            Nowa rozmowa
          </button>
        </div>

        {/* Historia */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px' }}>
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
                    borderRadius: 6, cursor: 'pointer', marginBottom: 2,
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={e => { if (activeConvId !== conv.conversation_id) e.currentTarget.style.background = '#111827' }}
                  onMouseLeave={e => { if (activeConvId !== conv.conversation_id) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div style={{ fontSize: 12, color: '#e8edf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                      {conv.title || 'Rozmowa'}
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {conv.agents_engaged && Array.isArray(conv.agents_engaged) && conv.agents_engaged.slice(0, 3).map((_, i) => (
                        <div key={i} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: AGENT_COLORS[i % 4].color, opacity: 0.7
                        }} />
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

        {/* Status */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2d47' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
            <span style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono' }}>Orchestrator aktywny</span>
          </div>
        </div>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{
          padding: '0 24px', height: 52, borderBottom: '1px solid #1e2d47',
          background: '#111827', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0
        }}>
          <div style={{ fontSize: 13, color: '#6b7fa3', fontFamily: 'DM Mono' }}>
            {activeConvId
              ? conversations.find(c => c.conversation_id === activeConvId)?.title || 'Rozmowa'
              : 'Nowa rozmowa'
            }
          </div>
          {currentSessionId && (
            <a
              href={`https://platform.claude.com/sessions/${currentSessionId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 10, color: '#6b7fa3', fontFamily: 'DM Mono', textDecoration: 'none', border: '1px solid #1e2d47', borderRadius: 4, padding: '3px 8px' }}
            >
              Console ↗
            </a>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 10%' }}>
          {messages.length === 0 ? (
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
                {[
                  'Przeanalizuj spółkę https://grenton.pl',
                  'Zbierz dane o rynku OZE w Polsce 2025',
                  'Zweryfikuj ten dokument inwestycyjny',
                  'Porównaj dwóch konkurentów w segmencie B2B SaaS'
                ].map(suggestion => (
                  <button key={suggestion} onClick={() => setInput(suggestion)} style={{
                    background: '#111827', border: '1px solid #1e2d47',
                    borderRadius: 20, padding: '7px 14px', fontSize: 12,
                    color: '#6b7fa3', cursor: 'pointer', fontFamily: 'Inter',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#2E5FA3'; e.currentTarget.style.color = '#e8edf5' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#1e2d47'; e.currentTarget.style.color = '#6b7fa3' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(msg => <Message key={msg.id} msg={msg} />)}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '16px 10%', borderTop: '1px solid #1e2d47', background: '#0a0e1a', flexShrink: 0 }}>
          <div style={{
            display: 'flex', gap: 10, alignItems: 'flex-end',
            background: '#111827', border: '1px solid #1e2d47',
            borderRadius: 12, padding: '10px 14px',
            transition: 'border-color 0.15s'
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
                flex: 1, background: 'transparent', border: 'none',
                outline: 'none', resize: 'none', fontSize: 14,
                color: '#e8edf5', fontFamily: 'Inter, sans-serif',
                lineHeight: 1.6, maxHeight: 120, overflow: 'auto'
              }}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: isLoading || !input.trim() ? '#1a2235' : '#1F3864',
                border: `1px solid ${isLoading || !input.trim() ? '#1e2d47' : '#2E5FA3'}`,
                cursor: isLoading || !input.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s', opacity: isLoading || !input.trim() ? 0.4 : 1
              }}
            >
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
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        textarea::placeholder { color: #6b7fa3; }
      `}</style>
    </div>
  )
}
