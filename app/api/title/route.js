export async function POST(req) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return Response.json({ title: 'New conversation' })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 30,
        messages: [{
          role: 'user',
          content: `Generate a concise 3-6 word title for a chat that starts with this message. Return ONLY the title, no quotes, no punctuation at end.\n\nMessage: ${prompt.slice(0, 300)}`
        }]
      })
    })

    if (!res.ok) {
      // Fallback: truncate the prompt nicely
      const words = prompt.trim().split(/\s+/).slice(0, 6).join(' ')
      return Response.json({ title: words })
    }

    const data = await res.json()
    const title = data.content?.[0]?.text?.trim() || prompt.slice(0, 60)
    return Response.json({ title })
  } catch (err) {
    return Response.json({ title: req.body?.prompt?.slice(0, 60) || 'New conversation' })
  }
}
