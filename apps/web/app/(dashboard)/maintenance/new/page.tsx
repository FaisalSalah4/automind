import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { MaintenanceForm } from '@/components/maintenance/maintenance-form'
import { redirect } from 'next/navigation'
import { CURRENCY_COOKIE, DEFAULT_CURRENCY, getCurrencySymbol } from '@/lib/currency'

export default async function NewMaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ carId?: string }>
}) {
  const { carId } = await searchParams
  const supabase = await createClient()
  const cookieStore = await cookies()
  const currencySymbol = getCurrencySymbol(
    cookieStore.get(CURRENCY_COOKIE)?.value ?? DEFAULT_CURRENCY
  )

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year, current_mileage')
    .order('created_at', { ascending: false })

  if (!cars || cars.length === 0) redirect('/cars/new')

  const selectedCarId = carId ?? cars[0].id

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Log Service</h1>
        <p className="text-muted-foreground">Record a maintenance service</p>
      </div>
      <MaintenanceForm cars={cars} defaultCarId={selectedCarId} currencySymbol={currencySymbol} />
    </div>
  )
}
