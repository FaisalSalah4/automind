import { createClient } from '@/lib/supabase/server'
import { predictUpcomingServices } from '@automind/shared'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const carId = searchParams.get('carId')

  if (!carId) return new Response('carId required', { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response('Unauthorized', { status: 401 })

  const [{ data: car }, { data: maintenance }] = await Promise.all([
    supabase.from('cars').select('*').eq('id', carId).single(),
    supabase
      .from('maintenance_logs')
      .select('*')
      .eq('car_id', carId)
      .order('mileage_at_service', { ascending: false })
      .limit(20),
  ])

  if (!car) return new Response('Car not found', { status: 404 })

  const predictions = predictUpcomingServices(maintenance ?? [], car.current_mileage)
  return Response.json(predictions)
}
