export async function GET(req, { params }) {
  try {
    const { fileId } = params

    // Fetch file metadata first to get filename + content-type
    const metaRes = await fetch(`https://api.anthropic.com/v1/files/${fileId}`, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      }
    })

    let filename = 'download'
    let contentType = 'application/octet-stream'

    if (metaRes.ok) {
      const meta = await metaRes.json()
      filename = meta.filename || meta.name || 'download'
      contentType = meta.media_type || meta.mime_type || contentType
    }

    // Fetch file content
    const fileRes = await fetch(`https://api.anthropic.com/v1/files/${fileId}/content`, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'files-api-2025-04-14'
      }
    })

    if (!fileRes.ok) {
      const err = await fileRes.text()
      return new Response(`File fetch failed: ${err}`, { status: fileRes.status })
    }

    const blob = await fileRes.arrayBuffer()

    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': blob.byteLength.toString()
      }
    })
  } catch (err) {
    return new Response(err.message, { status: 500 })
  }
}
