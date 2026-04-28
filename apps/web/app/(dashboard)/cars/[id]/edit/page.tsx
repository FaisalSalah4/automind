import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CarForm } from '@/components/cars/car-form'

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: car } = await supabase.from('cars').select('*').eq('id', id).single()

  if (!car) notFound()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Car</h1>
        <p className="text-muted-foreground">{car.name}</p>
      </div>
      <CarForm car={car} />
    </div>
  )
}
