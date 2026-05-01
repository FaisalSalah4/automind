import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const { messages, carId } = await req.json()

  // Mobile sends Bearer token; web uses cookies
  const authHeader = req.headers.get('Authorization')
  const supabase = authHeader?.startsWith('Bearer ')
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: authHeader } } }
      )
    : await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const [{ data: car }, { data: maintenance }, { data: fuel }, { data: reminders }, { data: accidents }] =
    await Promise.all([
      supabase.from('cars').select('*').eq('id', carId).single(),
      supabase
        .from('maintenance_logs')
        .select('*')
        .eq('car_id', carId)
        .order('service_date', { ascending: false })
        .limit(20),
      supabase
        .from('fuel_logs')
        .select('*')
        .eq('car_id', carId)
        .order('date', { ascending: false })
        .limit(20),
      supabase
        .from('reminders')
        .select('*')
        .eq('car_id', carId)
        .eq('is_done', false)
        .order('created_at', { ascending: false }),
      supabase
        .from('accident_logs')
        .select('*')
        .eq('car_id', carId)
        .order('date', { ascending: false })
        .limit(10),
    ])

  const systemPrompt = `You are CarMind, a smart car assistant. You have the user's complete car data below. Answer questions about maintenance history, costs, fuel consumption, upcoming services, and accident history. Be concise and specific.

CAR DATA:
${JSON.stringify({ car, maintenance, fuel, reminders, accidents }, null, 2)}

Today: ${new Date().toISOString().split('T')[0]}`

  const client = new Anthropic()

  // Strip extra fields added by useChat (id, createdAt) before sending to Anthropic
  const anthropicMessages = messages.map(
    ({ role, content }: { role: string; content: string }) => ({ role, content })
  )

  const anthropicStream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: anthropicMessages,
  })

  // Return raw text chunks — useChat uses streamProtocol: 'text', mobile reads directly
  const textStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta' &&
            event.delta.text
          ) {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
    },
  })
}
