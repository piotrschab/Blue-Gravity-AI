function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(`Missing env vars: ${!url ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!key ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`.trim())
  }
  return { url: url.replace(/\/$/, ''), key }
}

function supabaseHeaders(key) {
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
}

export async function GET() {
  try {
    const { url, key } = getSupabaseConfig()
    const res = await fetch(
      `${url}/rest/v1/bgc_conversations?select=*&order=created_at.desc&limit=100`,
      { headers: supabaseHeaders(key) }
    )
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Supabase ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }
    const data = await res.json()
    return Response.json({ conversations: data || [] })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const body = await req.json()
    const { conversationId, sessionId, title, messages, agents, status } = body

    if (!conversationId) {
      return Response.json({ error: 'Missing conversationId' }, { status: 400 })
    }

    const { url, key } = getSupabaseConfig()

    const payload = {
      conversation_id: conversationId,
      session_id: sessionId || null,
      messages: messages || [],
      agents_engaged: agents || [],
      status: status || 'done',
      updated_at: new Date().toISOString()
    }
    if (title !== null && title !== undefined) payload.title = title

    const res = await fetch(
      `${url}/rest/v1/bgc_conversations?on_conflict=conversation_id`,
      {
        method: 'POST',
        headers: { ...supabaseHeaders(key), 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(payload)
      }
    )
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Supabase ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }
    const data = await res.json()
    return Response.json({ conversation: data?.[0] || null })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const { conversationId, title } = await req.json()
    if (!conversationId || !title) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const { url, key } = getSupabaseConfig()
    const res = await fetch(
      `${url}/rest/v1/bgc_conversations?conversation_id=eq.${encodeURIComponent(conversationId)}`,
      {
        method: 'PATCH',
        headers: supabaseHeaders(key),
        body: JSON.stringify({ title, updated_at: new Date().toISOString() })
      }
    )
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Supabase ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { conversationId } = await req.json()
    if (!conversationId) return Response.json({ error: 'Missing conversationId' }, { status: 400 })

    const { url, key } = getSupabaseConfig()
    const res = await fetch(
      `${url}/rest/v1/bgc_conversations?conversation_id=eq.${encodeURIComponent(conversationId)}`,
      {
        method: 'DELETE',
        headers: supabaseHeaders(key)
      }
    )
    if (!res.ok) {
      const text = await res.text()
      return Response.json({ error: `Supabase ${res.status}: ${text.slice(0, 300)}` }, { status: 500 })
    }
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
