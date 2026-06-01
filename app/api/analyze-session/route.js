import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    let sessionId = searchParams.get('sessionId')

    // If no sessionId given, grab the most recent from Supabase
    if (!sessionId) {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('bgc_conversations')
        .select('session_id, title, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      if (data?.session_id) sessionId = data.session_id
    }

    if (!sessionId) return Response.json({ error: 'No session found' }, { status: 404 })

    const headers = {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'managed-agents-2026-04-01'
    }

    // Fetch all events
    const res = await fetch(
      `https://api.anthropic.com/v1/sessions/${sessionId}/events?limit=200&order=asc`,
      { headers }
    )
    if (!res.ok) {
      const t = await res.text()
      return Response.json({ error: `API ${res.status}: ${t.slice(0, 300)}` }, { status: 500 })
    }

    const { events = [] } = await res.json()

    // Fetch session metadata
    let sessionMeta = null
    try {
      const sr = await fetch(`https://api.anthropic.com/v1/sessions/${sessionId}`, { headers })
      if (sr.ok) sessionMeta = await sr.json()
    } catch (_) {}

    // ── Analyse events ────────────────────────────────────────────────────────
    const toMs = (ts) => ts ? new Date(ts).getTime() : null

    const firstTs = toMs(events[0]?.created_at)
    const lastTs  = toMs(events[events.length - 1]?.created_at)
    const totalMs = firstTs && lastTs ? lastTs - firstTs : null

    // Per-thread timing
    const threads = {}
    const gaps    = []   // idle periods > 5 s between consecutive events
    let prevTs    = firstTs

    // Tool call tallies
    const toolCalls = {}

    // Content size (chars as proxy for tokens — ~4 chars/token)
    let totalOutputChars = 0
    let totalInputChars  = 0

    for (const ev of events) {
      const ts  = toMs(ev.created_at)
      const tid = ev.thread_id || null
      const type = ev.type || ''

      // Gap detection
      if (prevTs && ts) {
        const gap = ts - prevTs
        if (gap > 5000) gaps.push({ from: ev.created_at, gapMs: gap, afterType: type })
      }
      prevTs = ts

      // Thread lifecycle
      if (type === 'session.thread_created') {
        threads[ev.thread_id] = {
          threadId: ev.thread_id,
          agentName: ev.agent_name || ev.agent?.name || null,
          startTs: ts, endTs: null, durationMs: null,
          messages: [], toolCalls: []
        }
      }
      if (type === 'session.thread_status_idle' && threads[ev.thread_id]) {
        threads[ev.thread_id].endTs = ts
        threads[ev.thread_id].durationMs = ts - threads[ev.thread_id].startTs
      }

      // Tool use
      if (type === 'tool_use' || type === 'agent.tool_use') {
        const toolName = ev.name || ev.tool_name || 'unknown'
        toolCalls[toolName] = (toolCalls[toolName] || 0) + 1
        if (tid && threads[tid]) threads[tid].toolCalls.push(toolName)
      }

      // Message sizes
      for (const block of (ev.content || [])) {
        if (block.type === 'text' && block.text) {
          if (type.includes('user') || type.includes('input')) totalInputChars += block.text.length
          else totalOutputChars += block.text.length
          if (tid && threads[tid]) threads[tid].messages.push({ chars: block.text.length, type })
        }
      }
    }

    // Sort gaps descending
    gaps.sort((a, b) => b.gapMs - a.gapMs)

    // Build summary
    const threadList = Object.values(threads).map(t => ({
      ...t,
      durationMs: t.durationMs || (t.startTs ? (lastTs - t.startTs) : null),
      estimatedInputTokens: Math.round(totalInputChars / 4),
      estimatedOutputTokens: Math.round(totalOutputChars / 4),
    }))

    // Bottleneck = thread with longest duration
    const bottleneck = [...threadList].sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0))[0]

    return Response.json({
      sessionId,
      sessionMeta,
      totalEvents: events.length,
      totalDurationMs: totalMs,
      totalDurationMin: totalMs ? +(totalMs / 60000).toFixed(1) : null,
      threads: threadList,
      bottleneck: bottleneck || null,
      topGaps: gaps.slice(0, 5),
      toolCalls,
      estimatedInputTokens: Math.round(totalInputChars / 4),
      estimatedOutputTokens: Math.round(totalOutputChars / 4),
      estimatedTotalTokens: Math.round((totalInputChars + totalOutputChars) / 4),
      rawEventTypes: [...new Set(events.map(e => e.type))],
      events: events.slice(0, 5),  // first 5 for shape inspection
    })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
