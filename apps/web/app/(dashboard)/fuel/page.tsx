import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { FuelLogList } from '@/components/fuel/fuel-log-list'
import { FuelForm } from '@/components/fuel/fuel-form'

export default async function FuelPage() {
  const supabase = await createClient()

  const { data: cars } = await supabase
    .from('cars')
    .select('id, name, make, model, year, current_mileage')
    .order('created_at', { ascending: false })

  const firstCar = cars?.[0]

  const { data: logs } = firstCar
    ? await supabase
        .from('fuel_logs')
        .select('*')
        .eq('car_id', firstCar.id)
        .order('date', { ascending: false })
        .limit(20)
    : { data: [] }

  const logsWithConsumption = (logs ?? []).map((log, i) => {
    const prev = logs?.[i + 1]
    let consumption: number | null = null
    if (prev && log.full_tank && prev.full_tank) {
      const kmDriven = log.mileage - prev.mileage
      if (kmDriven > 0) {
        consumption = (Number(log.liters) / kmDriven) * 100
      }
    }
    return { ...log, consumption }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fuel Tracker</h1>
          <p className="text-muted-foreground">
            {firstCar ? `${firstCar.year} ${firstCar.make} ${firstCar.model}` : 'No car selected'}
          </p>
        </div>
      </div>

      {firstCar && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Log Fill-up</CardTitle>
            </CardHeader>
            <CardContent>
              <FuelForm cars={cars ?? []} defaultCarId={firstCar.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fill-up History</CardTitle>
            </CardHeader>
            <CardContent>
              <FuelLogList logs={logsWithConsumption} />
            </CardContent>
          </Card>
        </div>
      )}

      {!firstCar && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">Add a car to start tracking fuel</p>
            <Button asChild>
              <Link href="/cars/new">Add a Car</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
