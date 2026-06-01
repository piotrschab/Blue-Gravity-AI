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

    // Always fetch ALL events from the beginning — client will set (not append) output
    const eventsUrl = `https://api.anthropic.com/v1/sessions/${sessionId}/events?limit=100&order=asc`

    const res = await fetch(eventsUrl, { headers })
    const text = await res.text()

    if (!res.ok) {
      return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }

    const data = JSON.parse(text)
    const events = data.events || data.data || []

    let done = false
    let outputText = ''
    let agentsEngaged = []
    let activeAgents = []
    let completedAgents = []
    let files = []   // { fileId, filename, contentType }

    for (const event of events) {
      const type = event.type || ''

      if (type === 'session.thread_created') {
        const agent = {
          threadId: event.thread_id || event.id || '',
          agentName: event.agent_name || event.agent?.name || null
        }
        if (!agentsEngaged.find(a => a.threadId === agent.threadId)) {
          agentsEngaged.push(agent)
          activeAgents.push(agent)
        }
      }

      if (type === 'session.thread_status_idle') {
        const tid = event.thread_id || ''
        activeAgents = activeAgents.filter(a => a.threadId !== tid)
        if (!completedAgents.includes(tid)) completedAgents.push(tid)
      }

      if (type === 'agent.message' || type === 'session.message' || type === 'message') {
        for (const block of (event.content || [])) {
          if (block.type === 'text' && block.text) {
            outputText += block.text
          }
          // File block formats the API might return
          const fileId =
            block.file?.id ||
            block.file_id ||
            block.source?.file_id ||
            (block.type === 'file' && block.id) ||
            null
          const filename =
            block.file?.name || block.file?.filename ||
            block.filename || block.name || null
          const contentType =
            block.file?.media_type || block.file?.mime_type ||
            block.media_type || block.mime_type || 'application/octet-stream'

          if (fileId && !files.find(f => f.fileId === fileId)) {
            files.push({ fileId, filename, contentType })
          }
        }
      }

      if (type === 'session.status_idle' || type === 'session.completed' || type === 'session.idle') {
        done = true
        activeAgents = []
      }
    }

    // Fallback: check session status directly if no done event found yet
    if (!done) {
      try {
        const statusRes = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, { headers })
        if (statusRes.ok) {
          const statusData = await statusRes.json()
          if (statusData.status === 'idle' || statusData.status === 'completed') {
            done = true
            activeAgents = []
          }
        }
      } catch (_) {}
    }

    return Response.json({ done, outputText, files, agentsEngaged, activeAgents, completedAgents })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
