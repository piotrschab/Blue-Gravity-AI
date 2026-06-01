export async function GET() {
  try {
    const res = await fetch('https://api.anthropic.com/v1/files?limit=100&order=desc', {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      }
    })

    const text = await res.text()
    if (!res.ok) return Response.json({ error: `HTTP ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })

    const data = JSON.parse(text)
    const files = data.data || data.files || []
    return Response.json({ files })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
