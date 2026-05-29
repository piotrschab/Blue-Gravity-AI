export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const after = searchParams.get('after') || null

    console.log('events called, sessionId:', sessionId, 'after:', after)

    if (!sessionId) {
      return Response.json({ error: 'Brak sessionId' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.log('ERROR: brak ANTHROPIC_API_KEY')
      return Response.json({ error: 'Brak API key' }, { status: 500 })
    }

    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }

    let eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events`
    if (after) eventsUrl += `?after=${encodeURIComponent(after)}`

    console.log('fetching:', eventsUrl)

    const res = await fetch(eventsUrl, { headers })
    const text = await res.text()

    console.log('events response status:', res.status, 'body:', text.slice(0, 200))

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(text)
    const events = data.events || data.data || []

    let lastId = after
    let done = false
    let outputChunks = []
    let agentsEngaged = []
    let activeAgents = []
    let completedAgents = []

    for (const event of events) {
      if (event.id) lastId = event.id
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

    if (!done) {
      const statusRes = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, { headers })
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        console.log('session status:', statusData.status)
        if (statusData.status === 'idle' || statusData.status === 'completed') {
          done = true
          activeAgents = []
        }
      }
    }

    return Response.json({ events, lastId, done, outputChunks, agentsEngaged, activeAgents, completedAgents })

  } catch (err) {
    console.log('CATCH ERROR:', err.message, err.stack?.slice(0, 300))
    return Response.json({ error: err.message }, { status: 500 })
  }
}
