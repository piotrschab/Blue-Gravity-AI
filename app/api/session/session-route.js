export async function POST(req) {
  try {
    const { prompt } = await req.json()

    // 1. Utwórz sesję
    const sessionRes = await fetch('https://api.anthropic.com/v1/beta/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'managed-agents-2026-04-01'
{
  "agent": {
    "type": "agent", 
    "id": process.env.ANTHROPIC_AGENT_ID
  },
  "environment_id": process.env.ANTHROPIC_ENVIRONMENT_ID
}
    })

    if (!sessionRes.ok) {
      const err = await sessionRes.json()
      return Response.json({ error: err.error?.message || 'Błąd tworzenia sesji' }, { status: 500 })
    }

    const session = await sessionRes.json()

    // 2. Wyślij prompt
    const sendRes = await fetch(`https://api.anthropic.com/v1/sessions/${session.id}/events`, {
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

    if (!sendRes.ok) {
      const err = await sendRes.json()
      return Response.json({ error: err.error?.message || 'Błąd wysyłania' }, { status: 500 })
    }

    return Response.json({ sessionId: session.id })

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
