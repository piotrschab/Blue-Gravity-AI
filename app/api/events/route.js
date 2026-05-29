export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')
    const after = searchParams.get('after') || null
 
    if (!sessionId) {
      return Response.json({ error: 'Brak sessionId' }, { status: 400 })
    }
 
    const apiKey = process.env.ANTHROPIC_API_KEY
    const headers = {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }
 
    // Pobierz eventy
    let eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events`
    if (after) eventsUrl += `?after=${after}`
 
    const res = await fetch(eventsUrl, { headers })
 
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Events HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }
 
    const data = await res.json()
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
 
    return Response.json({ events, lastId, done, outputChunks, agentsEngaged, activeAgents, completedAgents })
 
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack?.slice(0, 200) }, { status: 500 })
  }
}
 
