export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const afterId = searchParams.get('afterId') || null   // cursor: last event id seen

    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }

    // Always fetch from the beginning, use after= cursor if available
    let eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events?limit=100&order=asc`
    if (afterId) eventsUrl += `&after=${encodeURIComponent(afterId)}`

    const res = await fetch(eventsUrl, { headers })
    const text = await res.text()

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(text)
    const events = data.events || data.data || []

    // Cursor for next poll — use the last event's id
    let lastId = afterId
    if (events.length > 0) {
      const last = events[events.length - 1]
      lastId = last.id || last.event_id || afterId
    }

    let done = false
    let outputChunks = []
    let agentsEngaged = []
    let activeAgents = []
    let completedAgents = []

    for (const event of events) {
      const type = event.type || ''

      if (type === 'session.thread_created') {
        const agent = {
          threadId: event.thread_id || event.id || '',
          agentName: event.agent_name || event.agent?.name || null
        }
        agentsEngaged.push(agent)
        activeAgents.push(agent)
      }

      if (type === 'session.thread_status_idle') {
        const tid = event.thread_id || ''
        activeAgents = activeAgents.filter(a => a.threadId !== tid)
        completedAgents.push(tid)
      }

      if (type === 'agent.message' || type === 'session.message' || type === 'message') {
        for (const block of (event.content || [])) {
          if (block.type === 'text' && block.text) {
            outputChunks.push(block.text)
          }
        }
      }

      if (type === 'session.status_idle' || type === 'session.completed' || type === 'session.idle') {
        done = true
        activeAgents = []
      }
    }

    // Fallback: check session status directly
    if (!done) {
      const statusRes = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        if (statusData.status === 'idle' || statusData.status === 'completed') {
          done = true
          activeAgents = []
        }
      }
    }

    return Response.json({ lastId, done, outputChunks, agentsEngaged, activeAgents, completedAgents })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
