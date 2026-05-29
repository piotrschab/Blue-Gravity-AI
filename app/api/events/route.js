export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')
  const after = searchParams.get('after') || null

  if (!sessionId) {
    return Response.json({ error: 'Brak sessionId' }, { status: 400 })
  }

  try {
    const url = new URL(`https://api.anthropic.com/v1/sessions/${sessionId}/events`)
    if (after) url.searchParams.set('after', after)

    const res = await fetch(url.toString(), {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'managed-agents-2026-04-01'
      }
    })

    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const data = await res.json()
    const events = data.events || data.data || []

    let lastId = after
    let done = false
    let outputChunks = []
    let agentsEngaged = []
    let activeAgents = []   // agenci aktualnie pracujący
    let completedAgents = [] // agenci którzy skończyli

    for (const event of events) {
      if (event.id) lastId = event.id
      const type = event.type || ''

      // Agent uruchomiony
      if (type === 'session.thread_created') {
        const threadId = event.thread_id || ''
        const agentName = event.agent_name || event.name || null
        agentsEngaged.push({ threadId, agentName })
        activeAgents.push({ threadId, agentName })
      }

      // Agent zakończył
      if (type === 'session.thread_status_idle') {
        const threadId = event.thread_id || ''
        activeAgents = activeAgents.filter(a => a.threadId !== threadId)
        completedAgents.push(threadId)
      }

      // Output tekstowy
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

    // Jeśli nie znaleziono done w eventach, sprawdź status sesji bezpośrednio
    if (!done) {
      const statusRes = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'managed-agents-2026-04-01'
        }
      })

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        const sessionStatus = statusData.status || ''
        if (sessionStatus === 'idle' || sessionStatus === 'completed') {
          done = true
          activeAgents = []
        }
      }
    }

    return Response.json({
      events,
      lastId,
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
