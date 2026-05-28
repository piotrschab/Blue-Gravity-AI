export async function GET() {
  return Response.json({ conversations: [] })
}

export async function POST(req) {
  return Response.json({ conversation: null })
}
