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

    // Znajdź ostatnie ID i sprawdź czy sesja zakończona
    let lastId = after
    let done = false
    let outputChunks = []
    let agentsEngaged = []

    for (const event of events) {
      if (event.id) lastId = event.id
      const type = event.type || ''

      if (type === 'session.thread_created') {
        agentsEngaged.push(event.thread_id || '')
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
      }
    }

    return Response.json({
      events: events,
      lastId,
      done,
      outputChunks,
      agentsEngaged
    })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
