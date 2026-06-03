import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('bgc_conversations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return Response.json({ error: error.message }, { status: 500 })
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

    const supabase = getSupabase()

    // Build update payload — omit title if null so existing title is preserved
    const payload = {
      conversation_id: conversationId,
      session_id: sessionId || null,
      messages: messages || [],
      agents_engaged: agents || [],
      status: status || 'done',
      updated_at: new Date().toISOString()
    }
    if (title !== null && title !== undefined) payload.title = title

    const { data, error } = await supabase
      .from('bgc_conversations')
      .upsert(payload, { onConflict: 'conversation_id' })
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ conversation: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const { conversationId, title } = await req.json()
    if (!conversationId || !title) return Response.json({ error: 'Missing fields' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase
      .from('bgc_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const { conversationId } = await req.json()
    if (!conversationId) return Response.json({ error: 'Missing conversationId' }, { status: 400 })

    const supabase = getSupabase()
    const { error } = await supabase
      .from('bgc_conversations')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
