export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return Response.json({ error: 'Brak sessionId' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      let lastEventId = null
      let done = false
      let attempts = 0
      const maxAttempts = 180

      let outputBuffer = ''

      while (!done && attempts < maxAttempts) {
        attempts++
        await new Promise(r => setTimeout(r, 2000))

        try {
          const url = new URL(`https://api.anthropic.com/v1/sessions/${sessionId}/events`)
          if (lastEventId) url.searchParams.set('after', lastEventId)

          const res = await fetch(url.toString(), {
            headers: {
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'managed-agents-2026-04-01'
            }
          })

          if (!res.ok) continue

          const data = await res.json()
          const events = data.events || data.data || []

          for (const event of events) {
            if (event.id) lastEventId = event.id
            const type = event.type || ''

            if (type === 'session.thread_created') {
              send({ type: 'agent_engaged', threadId: event.thread_id || '' })
            }

            if (type === 'session.thread_status_idle') {
              send({ type: 'agent_done', threadId: event.thread_id || '' })
            }

            if (type === 'agent.message' || type === 'session.message') {
              const blocks = event.content || []
              for (const block of blocks) {
                if (block.type === 'text' && block.text) {
                  outputBuffer += block.text
                  send({ type: 'output_chunk', text: block.text })
                }
              }
            }

            if (type === 'session.status_idle' || type === 'session.completed') {
              send({ type: 'done', finalOutput: outputBuffer })
              done = true
              break
            }

            if (type === 'error') {
              send({ type: 'error', message: event.message || 'Nieznany błąd' })
              done = true
              break
            }
          }
        } catch (e) {
          // kontynuuj mimo błędu sieciowego
        }
      }

      if (!done) {
        send({ type: 'done', finalOutput: outputBuffer || 'Brak odpowiedzi — sprawdź Console.' })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}
