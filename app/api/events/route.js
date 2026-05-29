export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const afterTimestamp = searchParams.get('afterTimestamp') || null

    if (!sessionId) {
      return Response.json({ error: 'Brak sessionId' }, { status: 400 })
    }

    const headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }

    // Użyj created_at[gt] do paginacji zamiast after
    let eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events?limit=100&order=asc`
    if (afterTimestamp) {
      eventsUrl += `&created_at[gt]=${encodeURIComponent(afterTimestamp)}`
    }

    const res = await fetch(eventsUrl, { headers })
    const text = await res.text()

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(text)
    const events = data.events || data.data || []

    // Zapisz timestamp ostatniego eventu do następnego pollu
    let lastTimestamp = afterTimestamp
    if (events.length > 0) {
      const lastEvent = events[events.length - 1]
      lastTimestamp = lastEvent.created_at || lastEvent.timestamp || afterTimestamp
    }

    let done = false
    let outputChunks = []
    let agentsEngaged = []
    let activeAgents = []
    let completedAgents = []

    for (const event of events) {
      const type = event.type || ''

      if (type === 'session.thread_created') {
        const agent = { threadId: event.thread_id || '', agentName: event.agent_name || null }
        agentsEngaged.push(agent)
        activeAgents.push(agent)
      }

      if (type === 'session.thread_status_idle') {
        const tid = event.thread_id || ''
        activeAgents = activeAgents.filter(a => a.threadId !== tid)
        completedAgents.push(tid)
      }

      if (type === 'agent.message' || type === 'session.message') {
        for (const block of (event.content || [])) {
          if (block.type === 'text' && block.text) {
            outputChunks.push(block.text)
          }
        }
      }

      if (type === 'session.status_idle' || type === 'session.completed') {
        done = true
        activeAgents = []
      }
    }

    // Sprawdź status sesji jeśli nie znaleziono done w eventach
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

    return Response.json({
      events,
      lastTimestamp,
      done,
      outputChunks,
      agentsEngaged,
      activeAgents,
      completedAgents
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
