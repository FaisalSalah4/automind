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

  const [{ data: car }, { data: maintenance }, { data: fuel }, { data: reminders }] =
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
    ])

  const systemPrompt = `You are AutoMind, a smart car assistant. You have the user's complete car data below. Answer questions about maintenance history, costs, fuel consumption, and upcoming services. Be concise and specific.

CAR DATA:
${JSON.stringify({ car, maintenance, fuel, reminders }, null, 2)}

Today: ${new Date().toISOString().split('T')[0]}`

  const client = new Anthropic()

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  return new Response(stream.toReadableStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
