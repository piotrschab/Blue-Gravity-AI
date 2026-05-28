export async function POST(req) {
  try {
    const { prompt } = await req.json()

    const sessionRes = await fetch('https://api.anthropic.com/v1/beta/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'managed-agents-2026-04-01'
      },
      body: JSON.stringify({
        agent: { type: 'agent', id: process.env.ANTHROPIC_AGENT_ID },
        environment_id: process.env.ANTHROPIC_ENVIRONMENT_ID
      })
    })

    // Zawsze czytaj jako tekst najpierw
    const rawText = await sessionRes.text()
    
    if (!sessionRes.ok) {
      return Response.json({ 
        error: `HTTP ${sessionRes.status}: ${rawText.slice(0, 500)}` 
      }, { status: 500 })
    }

    const session = JSON.parse(rawText)

    const sendRes = await fetch(`https://api.anthropic.com/v1/beta/sessions/${session.id}/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'managed-agents-2026-04-01'
      },
      body: JSON.stringify({
        events: [{
          type: 'user.message',
          content: [{ type: 'text', text: prompt }]
        }]
      })
    })

    const sendText = await sendRes.text()

    if (!sendRes.ok) {
      return Response.json({ 
        error: `Send HTTP ${sendRes.status}: ${sendText.slice(0, 500)}` 
      }, { status: 500 })
    }

    return Response.json({ sessionId: session.id })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
