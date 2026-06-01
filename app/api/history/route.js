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

    const { data, error } = await supabase
      .from('bgc_conversations')
      .upsert(
        {
          conversation_id: conversationId,
          session_id: sessionId || null,
          title: title || 'Rozmowa',
          messages: messages || [],
          agents_engaged: agents || [],
          status: status || 'done',
          updated_at: new Date().toISOString()
        },
        { onConflict: 'conversation_id' }
      )
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ conversation: data })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
