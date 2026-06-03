// Event types that carry text the user should see
const TEXT_EVENT_TYPES = new Set([
  'agent.message',
  'session.message',
  'message',
  'agent.text',
  'text',
  // orchestrator intermediate messages
  'assistant',
  'assistant.message',
  'orchestrator.message',
])

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }

    // Fetch all events
    const eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events?limit=200&order=asc`
    const res = await fetch(eventsUrl, { headers })
    const text = await res.text()

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(text)
    const events = data.events || data.data || []

    let done = false
    let fatalError = null          // billing_error, auth_error, etc.
    let outputText = ''
    let statusLog = []             // intermediate orchestrator steps shown live
    let agentsEngaged = []
    let activeAgents = []
    let completedAgents = []
    let files = []

    for (const event of events) {
      const type = (event.type || '').toLowerCase()

      // ── Error events ──────────────────────────────────────────────────────
      if (type === 'error' || type === 'session.error' || event.error) {
        const errObj = event.error || event
        const code = errObj.code || errObj.error_code || 'error'
        const msg  = errObj.message || errObj.error_message || JSON.stringify(errObj)
        fatalError = { code, message: msg }
        done = true
        activeAgents = []
        continue
      }

      // ── Agent thread lifecycle ────────────────────────────────────────────
      if (type === 'session.thread_created') {
        const agent = {
          threadId: event.thread_id || event.id || '',
          agentName: event.agent_name || event.agent?.name || null
        }
        if (!agentsEngaged.find(a => a.threadId === agent.threadId)) {
          agentsEngaged.push(agent)
          activeAgents.push(agent)
        }
        if (agent.agentName) {
          statusLog.push(`▶ ${agent.agentName} started`)
        }
      }

      if (type === 'session.thread_status_idle') {
        const tid = event.thread_id || ''
        const agent = agentsEngaged.find(a => a.threadId === tid)
        activeAgents = activeAgents.filter(a => a.threadId !== tid)
        if (!completedAgents.includes(tid)) completedAgents.push(tid)
        if (agent?.agentName) {
          statusLog.push(`✓ ${agent.agentName} finished`)
        }
      }

      // ── Text content ──────────────────────────────────────────────────────
      // Collect text from ALL event types that carry content blocks
      const contentBlocks = event.content || event.delta?.content || []
      for (const block of contentBlocks) {
        // Main output text — from final assistant/agent messages
        if (block.type === 'text' && block.text) {
          if (TEXT_EVENT_TYPES.has(type) || type.includes('message') || type.includes('agent')) {
            outputText += block.text
          }
        }

        // Files
        const fileId =
          block.file?.id || block.file_id ||
          block.source?.file_id ||
          (block.type === 'file' && block.id) || null
        if (fileId && !files.find(f => f.fileId === fileId)) {
          files.push({
            fileId,
            filename: block.file?.name || block.file?.filename || block.filename || block.name || null,
            contentType: block.file?.media_type || block.media_type || 'application/octet-stream'
          })
        }
      }

      // ── Done signals ──────────────────────────────────────────────────────
      if (
        type === 'session.status_idle' ||
        type === 'session.completed'   ||
        type === 'session.idle'
      ) {
        done = true
        activeAgents = []
      }
    }

    // Fallback: poll session status
    if (!done && !fatalError) {
      try {
        const sr = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, { headers })
        if (sr.ok) {
          const sd = await sr.json()
          if (sd.status === 'idle' || sd.status === 'completed') {
            done = true
            activeAgents = []
          }
          // Check for error status on the session itself
          if (sd.status === 'error' || sd.last_error) {
            const e = sd.last_error || {}
            fatalError = {
              code: e.code || sd.status,
              message: e.message || 'Session ended with an error.'
            }
            done = true
            activeAgents = []
          }
        }
      } catch (_) {}
    }

    return Response.json({
      done,
      fatalError,
      outputText,
      statusLog,
      files,
      agentsEngaged,
      activeAgents,
      completedAgents,
      // expose raw event types seen — useful for debugging
      _eventTypes: [...new Set(events.map(e => e.type))]
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
