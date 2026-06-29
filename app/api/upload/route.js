export async function POST(req) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

    const upload = new FormData()
    upload.append('file', file, file.name)

    const res = await fetch('https://api.anthropic.com/v1/files', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      },
      body: upload
    })

    const text = await res.text()
    if (!res.ok) return Response.json({ error: `Upload failed ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })

    const data = JSON.parse(text)
    return Response.json({
      fileId: data.id,
      filename: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
